<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryClient } from '@tanstack/vue-query'
import PButton from '@/components/ui/PButton.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import { Skeleton } from '@/components/states'
import type { Driver, GrandPrix, RaceSession } from '@/api/schemas'
import { driverOption } from '@/lib/adminDrivers'
import { formatTime } from '@/utils/dates'
import type { Diff, Prefill, Purpose, PublicSessionData } from '@/lib/publicData'

/**
 * M5 · «Rellenar con datos públicos». Loads (lazily) the public order of a session, shows a
 * preview with its source and the differences against the form, and only on «Aplicar» emits the
 * prefill. Nothing is saved here; a failure leaves the form untouched.
 */
const props = defineProps<{
  purpose: Purpose
  session: RaceSession
  sessions: RaceSession[]
  gp?: GrandPrix
  drivers: Driver[]
  /** Positions in the form (driver id per position) to compute differences. */
  current: (number | null)[]
  /** Number of positions of the form. */
  count: number
}>()
const emit = defineEmits<{ apply: [prefill: Prefill] }>()
const { t } = useI18n()
const qc = useQueryClient()

type State = 'idle' | 'loading' | 'error' | 'empty' | 'preview' | 'unsupported'
const state = ref<State>('idle')
const data = ref<PublicSessionData>()
const prefill = ref<Prefill>()
const changes = ref<Diff[]>([])
let ctl: AbortController | undefined
onBeforeUnmount(() => ctl?.abort())

const label = (id: number | null) => {
  const d = props.drivers.find((x) => x.id === id)
  return d ? driverOption(d) : t('admin.sessions.publicData.emptySlot')
}
const fastLabel = computed(() => (prefill.value?.fast != null ? label(prefill.value.fast) : null))
const pits = computed(() => prefill.value?.isFromPit.filter(Boolean).length ?? 0)
const unmatched = computed(() =>
  (prefill.value?.unmatched ?? []).map((u) => `${u.firstName ?? ''} ${u.lastName}`.trim()).join(', '),
)
const sourceName = computed(() =>
  data.value ? t(`admin.sessions.publicData.sources.${data.value.source}`) : '',
)

async function load() {
  ctl?.abort()
  ctl = new AbortController()
  const { signal } = ctl
  data.value = undefined
  state.value = 'loading'
  try {
    // Lazy: the public-data layer is not part of the admin bundle until someone asks for it.
    const pd = await import('@/lib/publicData')
    const kind = pd.sessionKind(props.session)
    const win = pd.gpWindow(props.sessions)
    const season = Number(/\d{4}/.exec(props.gp?.season?.name ?? '')?.[0] ?? '')
    const year = Number.isFinite(season) && season > 0 ? season : win ? new Date(win.from).getUTCFullYear() : NaN
    if (!kind || !win || !Number.isFinite(year)) {
      state.value = 'unsupported'
      return
    }
    const res = await pd.fetchPublicData(
      qc,
      {
        purpose: props.purpose,
        kind,
        gp: { year, ...win, circuit: props.gp?.circuit ?? undefined },
      },
      signal,
    )
    if (signal.aborted) return
    data.value = res
    prefill.value = pd.toPrefill(res.rows, res.fastest, props.drivers, props.count)
    changes.value = pd.diffs(props.current, prefill.value.drivers)
    state.value = 'preview'
  } catch (e) {
    if (signal.aborted) return
    state.value = e instanceof Error && e.name === 'PublicDataEmptyError' ? 'empty' : 'error'
  }
}
function apply() {
  if (prefill.value) emit('apply', prefill.value)
  state.value = 'idle'
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <PButton
        variant="outline"
        size="sm"
        :loading="state === 'loading'"
        :disabled="state === 'loading'"
        @click="load"
      >
        {{ t('admin.sessions.publicData.button') }}
      </PButton>
      <span v-if="state === 'loading'" class="text-muted text-sm" role="status">{{
        t('admin.sessions.publicData.loading')
      }}</span>
    </div>

    <PrognoAlert
      v-if="state === 'error'"
      variant="err"
      :title="t('admin.sessions.publicData.error')"
    >
      <PButton variant="outline" size="sm" @click="load">{{
        t('admin.sessions.publicData.retry')
      }}</PButton>
    </PrognoAlert>
    <PrognoAlert
      v-else-if="state === 'empty'"
      variant="info"
      :title="t('admin.sessions.publicData.empty')"
    />
    <PrognoAlert
      v-else-if="state === 'unsupported'"
      variant="info"
      :title="t('admin.sessions.publicData.notAvailable')"
    />
    <Skeleton v-else-if="state === 'loading'" variant="card" />

    <section
      v-else-if="state === 'preview' && data && prefill"
      class="border-border bg-surface-muted flex flex-col gap-2 rounded-lg border p-3"
      :aria-label="t('admin.sessions.publicData.previewTitle')"
    >
      <h3 class="t-header text-heading">{{ t('admin.sessions.publicData.previewTitle') }}</h3>
      <p class="text-muted text-sm">
        {{
          t('admin.sessions.publicData.source', {
            source: sourceName,
            time: formatTime(data.fetchedAt),
          })
        }}
      </p>
      <PrognoAlert
        v-for="w in data.warnings"
        :key="w"
        variant="warn"
        :title="t(`admin.sessions.publicData.warnings.${w}`)"
      />
      <p v-if="!changes.length" class="text-sm">{{ t('admin.sessions.publicData.noChanges') }}</p>
      <template v-else>
        <p class="text-sm font-semibold">
          {{ t('admin.sessions.publicData.changes', { n: changes.length }, changes.length) }}
        </p>
        <ul class="text-sm">
          <li v-for="c in changes" :key="c.position">
            {{
              t('admin.sessions.publicData.change', {
                n: c.position,
                from: label(c.from),
                to: label(c.to),
              })
            }}
          </li>
        </ul>
      </template>
      <p v-if="purpose === 'grid' && pits" class="text-sm">
        {{ t('admin.sessions.publicData.pitLane', { n: pits }, pits) }}
      </p>
      <p v-if="purpose === 'results' && fastLabel" class="text-sm">
        {{ t('admin.sessions.publicData.fastLap', { driver: fastLabel }) }}
      </p>
      <PrognoAlert
        v-if="unmatched"
        variant="warn"
        :title="t('admin.sessions.publicData.unmatched', { list: unmatched })"
      />
      <p class="text-muted text-xs">
        {{ t('admin.sessions.publicData.attribution', { source: sourceName }) }} ·
        {{ t('admin.sessions.publicData.applyHint') }}
      </p>
      <div class="flex gap-2">
        <PButton size="sm" @click="apply">{{ t('admin.sessions.publicData.apply') }}</PButton>
        <PButton variant="outline" size="sm" @click="state = 'idle'">{{
          t('admin.sessions.publicData.discard')
        }}</PButton>
      </div>
    </section>
  </div>
</template>
