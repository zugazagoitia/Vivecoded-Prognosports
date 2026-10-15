<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import ConfirmLeaveDialog from '@/components/data/ConfirmLeaveDialog.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTag from '@/components/ui/PTag.vue'
import { iconFor } from '@/components/ui/icons'
import { textColorFor } from '@/components/ui/textColor'
import { useAdminCrumbs } from '@/composables/useAdminCrumbs'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import {
  assignDriver,
  bannerTone,
  buildSlots,
  clearSlot,
  cssColor,
  diffSlots,
  driverFullName,
  driversBody,
  driverSurname,
  filledCount,
  poolWhere,
  slotChanged,
  SLOTS_PER_TEAM,
  type Slot,
} from '@/lib/adminDrivers'
import { gpShortName } from '@/lib/gp'
import {
  useGpDrivers,
  useReplaceGpDrivers,
  useSeasonConstructors,
  useSeasonDrivers,
} from '@/queries/admin'
import { useSeasonGps } from '@/queries/circuits'
import { useGpDetail } from '@/queries/gp'

/**
 * M4 · Pilotos de un GP (`/admin/gps/:competicion/:temporada/:gp/pilotos`): pool of the season's
 * drivers + two slots per team, two-click assignment, clone from another GP and a banner with the
 * changes against the reference GP. Saving sends the whole final list (the API replaces it; see
 * `api/admin.ts`). The API does not store a team per GP: the slot's team is the driver's season team.
 */
definePage({ meta: { title: 'route.adminGpDrivers' } })

const { t } = useI18n()
const route = useRoute('/admin/gps/[competicion]/[temporada]/[gp]/pilotos')
const comp = computed(() => route.params.competicion)
const seasonId = computed(() => route.params.temporada)

const detail = useGpDetail(comp, seasonId, () => route.params.gp)
const gps = useSeasonGps(comp, seasonId)
const gp = computed(() => detail.gp.value)
const teamsQ = useSeasonConstructors(seasonId)
const poolQ = useSeasonDrivers(seasonId)
const savedQ = useGpDrivers(comp, seasonId, () => gp.value?.id)

const teams = computed(() => teamsQ.data.value ?? [])
const pool = computed(() =>
  [...(poolQ.data.value ?? [])].sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9)),
)
const byId = computed(() => new Map(pool.value.map((d) => [d.id, d])))
const total = computed(() => teams.value.length * SLOTS_PER_TEAM)

// Reference GP (banner and «Clonar»): the GPs of the season before this one.
const refId = ref<number | undefined>()
const earlier = computed(() => {
  const round = gp.value?.round ?? Infinity
  return (gps.data.value ?? [])
    .filter((g) => g.id !== gp.value?.id && (g.round ?? 0) < round)
    .sort((a, b) => (b.round ?? 0) - (a.round ?? 0))
})
watch(
  () => [detail.previous.value?.id, earlier.value.length] as const,
  ([prev]) => {
    if (refId.value == null) refId.value = prev ?? earlier.value[0]?.id
  },
  { immediate: true },
)
const refDrivers = useGpDrivers(comp, seasonId, refId)
const refGp = computed(() => earlier.value.find((g) => g.id === refId.value))
const refName = computed(() => (refGp.value ? gpShortName(refGp.value) : ''))
const refSlots = computed(() =>
  refDrivers.data.value ? buildSlots(teams.value, refDrivers.data.value) : [],
)

const saved = ref<Slot[]>([])
const slots = ref<Slot[]>([])
const selected = ref<number | null>(null)
const ready = computed(() => !!teamsQ.data.value && !!savedQ.data.value)
watch(
  [ready, () => savedQ.data.value, () => teamsQ.data.value],
  () => {
    if (!ready.value) return
    saved.value = buildSlots(teams.value, savedQ.data.value!)
    slots.value = saved.value.map((s) => ({ ...s }))
  },
  { immediate: true },
)

const dirty = computed(() => slots.value.some((s, i) => s.driverId !== saved.value[i]?.driverId))
const guard = useUnsavedChanges(dirty)
useAdminCrumbs(() => [
  {
    label: gp.value ? gpShortName(gp.value) : '…',
    to: `/admin/gps/${comp.value}/${seasonId.value}/${route.params.gp}`,
  },
  { label: t('admin.gpDrivers.crumb') },
])

const filled = computed(() => filledCount(slots.value))
const changes = computed(() => diffSlots(refSlots.value, slots.value))
const tone = computed(() =>
  bannerTone(filled.value, total.value, refGp.value ? changes.value.length : 0),
)
const name = (id: number | null) =>
  id != null && byId.value.get(id) ? driverSurname(byId.value.get(id)!) : null
const teamName = (id: number) => teams.value.find((x) => x.id === id)?.name ?? ''
const changeText = computed(() =>
  changes.value
    .map((c) =>
      t('admin.gpDrivers.banner.item', {
        team: teamName(c.teamId),
        before: name(c.before) ?? t('admin.gpDrivers.banner.none'),
        after: name(c.after) ?? t('admin.gpDrivers.banner.free'),
      }),
    )
    .join(' · '),
)
const bannerClass = {
  ok: 'bg-ok-tint text-ok-fg',
  warn: 'bg-warn-tint text-warn-fg',
  err: 'bg-err-tint text-err-fg',
}
const bannerIcon = { ok: 'check_circle', warn: 'compare_arrows', err: 'error' } as const

function pick(id: number) {
  selected.value = selected.value === id ? null : id
}
function place(idx: number) {
  if (selected.value == null) return
  slots.value = assignDriver(slots.value, selected.value, idx)
  selected.value = null
}
const clear = (idx: number) => (slots.value = clearSlot(slots.value, idx))
function clone() {
  if (!refDrivers.data.value) return
  slots.value = buildSlots(teams.value, refDrivers.data.value)
  selected.value = null
}
function undo() {
  slots.value = saved.value.map((s) => ({ ...s }))
  selected.value = null
}
const save = useReplaceGpDrivers(() => ({
  comp: comp.value,
  season: seasonId.value,
  gp: gp.value!.id,
}))
const onSave = () => save.mutate(driversBody(slots.value))

const slotsOf = (teamId: number) =>
  slots.value.map((s, idx) => ({ s, idx })).filter((x) => x.s.teamId === teamId)
const refOptions = computed(() =>
  earlier.value.map((g) => ({
    value: g.id,
    label: t('admin.gpDrivers.refOption', { name: gpShortName(g), round: g.round ?? '' }),
  })),
)
const fg = (color: string | null | undefined) =>
  textColorFor(color ?? '') === 'white' ? 'text-white' : 'text-black'
const year = computed(() => gp.value?.season?.name ?? '')
const anyError = computed(
  () => detail.isError.value || teamsQ.isError.value || poolQ.isError.value || savedQ.isError.value,
)
function retry() {
  void detail.refetch()
  void teamsQ.refetch()
  void poolQ.refetch()
  void savedQ.refetch()
}
</script>

<template>
  <ErrorState
    v-if="anyError"
    :what="t('admin.gpDrivers.error')"
    :error="detail.error.value ?? teamsQ.error.value ?? poolQ.error.value ?? savedQ.error.value"
    @retry="retry"
  />
  <div v-else class="flex flex-col gap-5">
    <AdminHeader
      :title="gp ? t('admin.gpDrivers.title', { name: gpShortName(gp) }) : '…'"
      :subtitle="t('admin.gpDrivers.instructions')"
    >
      <div class="flex flex-wrap items-end gap-2">
        <div class="w-auto">
          <PSelect
            :model-value="refId ?? ''"
            :options="refOptions"
            :label="t('admin.gpDrivers.cloneFrom')"
            @update:model-value="(v) => (refId = Number(v))"
          />
        </div>
        <PButton
          variant="soft"
          :icon="iconFor('content_copy')"
          :disabled="!refDrivers.data.value"
          @click="clone"
        >
          {{ t('admin.gpDrivers.clone') }}
        </PButton>
      </div>
    </AdminHeader>

    <Skeleton v-if="!ready || !poolQ.data.value" variant="card" />
    <EmptyState
      v-else-if="!pool.length || !teams.length"
      :title="t('admin.gpDrivers.noDrivers')"
      icon="sports_motorsports"
    >
      <PButton to="/admin/pilotos">{{ t('admin.nav.items.pilotos') }}</PButton>
    </EmptyState>
    <template v-else>
      <div
        role="status"
        :class="[
          bannerClass[tone],
          'flex flex-wrap items-center gap-3 rounded-lg px-4 py-3 text-sm',
        ]"
      >
        <PIcon :name="iconFor(bannerIcon[tone])" />
        <b class="tabular-nums">{{ t('admin.gpDrivers.banner.count', { n: filled, total }) }}</b>
        <span v-if="!refGp">{{ t('admin.gpDrivers.banner.noRef') }}</span>
        <span v-else-if="!changes.length">{{
          t('admin.gpDrivers.banner.same', { gp: refName })
        }}</span>
        <span v-else
          >{{
            t('admin.gpDrivers.banner.changes', { k: changes.length, gp: refName }, changes.length)
          }}
          · {{ changeText }}</span
        >
        <span v-if="filled === 0" class="basis-full">{{ t('admin.gpDrivers.emptyHint') }}</span>
      </div>

      <div class="drv-lay">
        <PCard>
          <h2 class="t-header text-heading">{{ t('admin.gpDrivers.pool.title', { year }) }}</h2>
          <p class="text-muted mb-2 text-xs" aria-live="polite">
            {{
              selected != null && byId.get(selected)
                ? t('admin.gpDrivers.pool.selected', { name: driverFullName(byId.get(selected)!) })
                : t('admin.gpDrivers.pool.hint')
            }}
          </p>
          <ul
            class="m-0 flex list-none flex-col gap-1.5 p-0"
            :aria-label="t('admin.gpDrivers.pool.list')"
          >
            <li v-for="d in pool" :key="d.id">
              <button
                type="button"
                :aria-pressed="selected === d.id"
                :class="[
                  'focus-visible:outline-focus-ring flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-9',
                  selected === d.id
                    ? 'bg-tint border-focus-ring'
                    : poolWhere(slots, d.id, teams) == null
                      ? 'bg-warn-tint border-border'
                      : 'bg-surface border-border',
                ]"
                @click="pick(d.id)"
              >
                <span class="text-muted w-7 font-bold tabular-nums">#{{ d.number ?? '–' }}</span>
                <span class="text-heading flex-1">{{ driverFullName(d) }}</span>
                <span class="text-muted text-xs">{{
                  poolWhere(slots, d.id, teams) ?? t('admin.gpDrivers.pool.noTeam')
                }}</span>
              </button>
            </li>
          </ul>
        </PCard>

        <div class="grid3">
          <section
            v-for="team in teams"
            :key="team.id"
            class="bg-surface ring-card-ring overflow-hidden rounded-lg shadow-sm ring-1"
          >
            <header
              :class="[
                'flex items-center justify-between px-3 py-2 text-sm font-bold',
                fg(cssColor(team.teamcolor)),
              ]"
              :style="{ background: cssColor(team.teamcolor) }"
            >
              <span>{{ team.name }}</span>
              <span class="font-medium tabular-nums"
                >{{ slotsOf(team.id).filter((x) => x.s.driverId != null).length }}/{{
                  SLOTS_PER_TEAM
                }}</span
              >
            </header>
            <div class="flex flex-col gap-1.5 p-2">
              <div v-for="x in slotsOf(team.id)" :key="x.idx" class="flex gap-1.5">
                <button
                  type="button"
                  :aria-label="
                    t('admin.gpDrivers.slot.aria', {
                      team: team.name,
                      n: x.s.index + 1,
                      driver: name(x.s.driverId) ?? t('admin.gpDrivers.slot.ariaFree'),
                    })
                  "
                  :class="[
                    'focus-visible:outline-focus-ring flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-1 rounded-md border px-2 text-left text-[13px] focus-visible:outline-2 md:min-h-10',
                    refGp && slotChanged(refSlots, slots, x.idx)
                      ? 'bg-warn-tint border-warn'
                      : x.s.driverId == null
                        ? 'text-muted bg-surface border-border-input border-dashed'
                        : 'bg-surface-muted border-transparent',
                  ]"
                  @click="place(x.idx)"
                >
                  <span class="text-heading">
                    {{
                      x.s.driverId != null && byId.get(x.s.driverId)
                        ? `${driverSurname(byId.get(x.s.driverId)!)} #${byId.get(x.s.driverId)!.number ?? ''}`
                        : t('admin.gpDrivers.slot.free')
                    }}
                  </span>
                  <PTag v-if="refGp && slotChanged(refSlots, slots, x.idx)" color="warn">{{
                    t('admin.gpDrivers.slot.change')
                  }}</PTag>
                </button>
                <button
                  type="button"
                  class="text-muted hover:bg-surface-muted focus-visible:outline-focus-ring flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md focus-visible:outline-2 md:min-h-10 md:min-w-10"
                  :aria-label="
                    t('admin.gpDrivers.slot.clearAria', { n: x.s.index + 1, team: team.name })
                  "
                  @click="clear(x.idx)"
                >
                  <PIcon :name="iconFor('close')" :size="16" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <span v-if="filled < total" class="text-muted mr-auto text-xs">{{
          t('admin.gpDrivers.missing', { k: total - filled })
        }}</span>
        <PButton variant="outline" :disabled="!dirty || save.isPending.value" @click="undo">{{
          t('admin.gpDrivers.undo')
        }}</PButton>
        <PButton
          :disabled="filled !== total || !dirty"
          :loading="save.isPending.value"
          @click="onSave"
          >{{ t('admin.gpDrivers.save') }}</PButton
        >
      </div>
    </template>
    <ConfirmLeaveDialog :open="guard.open.value" @stay="guard.stay" @leave="guard.leave" />
  </div>
</template>

<style>
.drv-lay {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
@media (min-width: 1101px) {
  .drv-lay {
    grid-template-columns: 280px minmax(0, 1fr);
  }
}
</style>
