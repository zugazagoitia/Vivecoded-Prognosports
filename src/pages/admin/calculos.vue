<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTag from '@/components/ui/PTag.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import { iconFor } from '@/components/ui/icons'
import { useNow } from '@/composables/useNow'
import { toaster } from '@/composables/useToast'
import { recalcGps, relativeStamp, scopeLabel, type CalcRecord } from '@/lib/adminNotify'
import { gpShortName, sessionLabel, sortedSessions } from '@/lib/gp'
import { isUnavailable, useRecalculate } from '@/queries/admin'
import { DEFAULT_COMPETITION, useCurrentSeason, useSeasonGps } from '@/queries/circuits'

/**
 * M13 · Cálculo de puntos (`/admin/calculos?gp=&sesion=`). The recalculation endpoint for all
 * communities does not exist in the spec (a local backend answers 404 for the candidate), so the
 * action ends in «aún no disponible» and the history only lists what was launched here.
 */
definePage({ meta: { title: 'route.adminCalcs' } })
// Loaded on demand: the public data layer stays out of the eager bundle (issue 205).
const PublicCrossCheckAvailability = defineAsyncComponent(
  () => import('@/components/admin/PublicCrossCheckAvailability.vue'),
)

const { t } = useI18n()
const route = useRoute()
const now = useNow(60_000)
const seasonQ = useCurrentSeason(DEFAULT_COMPETITION)
const seasonId = computed(() => seasonQ.data.value?.id)
const gpsQ = useSeasonGps(DEFAULT_COMPETITION, seasonId)
const gps = computed(() => recalcGps(gpsQ.data.value ?? [], now.value))

const gpId = ref<number | undefined>()
const sessionId = ref<number | 'all'>('all')
watch(
  gps,
  (list) => {
    if (gpId.value != null || !list.length) return
    const wanted = Number(route.query.gp)
    gpId.value = list.find((g) => g.id === wanted)?.id ?? list[0]!.id
    const s = Number(route.query.sesion)
    if (Number.isFinite(s) && s > 0) sessionId.value = s
  },
  { immediate: true },
)
const gp = computed(() => gps.value.find((g) => g.id === gpId.value))
const gpOptions = computed(() =>
  gps.value.map((g) => ({
    value: g.id,
    label: t('admin.calcs.gpOption', { name: gpShortName(g), round: g.round ?? '' }),
  })),
)
const sessions = computed(() => (gp.value ? sortedSessions(gp.value) : []))
const sessionOptions = computed(() => [
  { value: 'all', label: t('admin.calcs.all') },
  ...sessions.value.map((s) => ({ value: s.id, label: sessionLabel(s).long })),
])
function onGp(v: string | number) {
  gpId.value = Number(v)
  sessionId.value = 'all'
}

const history = ref<CalcRecord[]>([])
let seq = 0
const confirm = ref(false)
const running = ref(false)
const recalc = useRecalculate(() => ({
  comp: gp.value?.competition?.id ?? DEFAULT_COMPETITION,
  season: seasonId.value ?? '',
  gp: gp.value?.id ?? 0,
}))
const scopeText = computed(() =>
  scopeLabel(
    gp.value ? gpShortName(gp.value) : '',
    sessionId.value === 'all'
      ? null
      : sessions.value.find((s) => s.id === sessionId.value)
        ? sessionLabel(sessions.value.find((s) => s.id === sessionId.value)!).long
        : null,
    t('admin.calcs.all'),
  ),
)

async function run() {
  if (!gp.value) return
  const targets =
    sessionId.value === 'all'
      ? sessions.value
      : sessions.value.filter((s) => s.id === sessionId.value)
  const record: CalcRecord = {
    id: ++seq,
    at: Date.now(),
    gp: gpShortName(gp.value),
    session: sessionId.value === 'all' ? null : sessionLabel(targets[0]!).long,
    status: 'running',
  }
  history.value = [record, ...history.value]
  running.value = true
  try {
    for (const s of targets) await recalc.mutateAsync(s.id)
    record.status = 'done'
    toaster.success(t('admin.calcs.done'))
  } catch (e) {
    record.status = 'error'
    toaster.error(isUnavailable(e) ? t('admin.calcs.unavailable') : t('admin.calcs.failed'))
  } finally {
    running.value = false
    history.value = [...history.value]
  }
}
function stamp(at: number): string {
  const s = relativeStamp(now.value, at)
  return s.kind === 'days'
    ? t('admin.calcs.history.days', { n: s.n }, s.n)
    : t(`admin.calcs.history.${s.kind === 'today' ? 'today' : 'yesterday'}`, { time: s.time })
}
const statusColor = { done: 'ok', error: 'err', running: 'info' } as const
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminHeader :title="t('admin.calcs.title')" :subtitle="t('admin.calcs.subtitle')" />
    <p
      class="bg-warn-tint text-warn-fg flex items-start gap-3 rounded-sm px-4 py-3 text-sm"
      role="note"
    >
      <PIcon :name="iconFor('warning')" />
      {{ t('admin.calcs.warning') }}
    </p>

    <PCard :title="t('admin.calcs.card')" :padded="false">
      <div class="grid2 gap-4 p-5">
        <Skeleton v-if="gpsQ.isLoading.value" variant="line" />
        <p v-else-if="!gps.length" class="text-muted col-span-full text-sm">
          {{ t('admin.calcs.noGps') }}
        </p>
        <template v-else>
          <PSelect
            :model-value="gpId ?? ''"
            :label="t('admin.calcs.gp')"
            :options="gpOptions"
            :disabled="running"
            @update:model-value="onGp"
          />
          <PSelect
            v-model="sessionId"
            :label="t('admin.calcs.session')"
            :options="sessionOptions"
            :disabled="running"
          />
        </template>
      </div>
      <div class="border-border flex justify-end border-t px-5 py-3">
        <PButton size="sm" :disabled="!gp" :loading="running" @click="confirm = true">{{
          t('admin.calcs.recalc')
        }}</PButton>
      </div>
    </PCard>

    <PCard
      v-if="gp"
      :title="t('publicCrossCheck.publicCrossCheck.availability.title')"
      :padded="false"
    >
      <div class="flex flex-col gap-3 p-4">
        <p class="text-muted text-sm">
          {{ t('publicCrossCheck.publicCrossCheck.availability.subtitle') }}
        </p>
        <PublicCrossCheckAvailability
          v-for="s in sessions"
          :key="s.id"
          :comp="DEFAULT_COMPETITION"
          :season="String(seasonId ?? '')"
          :year="Number(seasonQ.data.value?.name) || undefined"
          :gp="gp"
          :session="s"
          :now="now"
        />
      </div>
    </PCard>

    <PCard :title="t('admin.calcs.history.title')" :padded="false">
      <div class="p-4">
        <p v-if="!history.length" class="text-muted text-sm">
          {{ t('admin.calcs.history.empty') }}
        </p>
        <AdminTable v-else :caption="t('admin.calcs.history.caption')">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.calcs.history.date') }}</th>
              <th scope="col">{{ t('admin.calcs.history.scope') }}</th>
              <th scope="col">{{ t('admin.calcs.history.state') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td>{{ stamp(h.at) }}</td>
              <td>{{ scopeLabel(h.gp, h.session, t('admin.calcs.all')) }}</td>
              <td>
                <PTag :color="statusColor[h.status]">{{
                  t(`admin.calcs.history.${h.status}`)
                }}</PTag>
              </td>
            </tr>
          </tbody>
        </AdminTable>
      </div>
    </PCard>

    <PrognoModal
      v-model:open="confirm"
      destructive
      :title="t('admin.calcs.confirmTitle')"
      :description="t('admin.calcs.confirmBody', { scope: scopeText })"
      :confirm-label="t('admin.calcs.confirm')"
      @confirm="run"
    />
  </div>
</template>
