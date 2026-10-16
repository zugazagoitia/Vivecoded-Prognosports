<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Skeleton, ErrorState } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTag from '@/components/ui/PTag.vue'
import PublicFillPanel from '@/components/admin/PublicFillPanel.vue'
import type { Driver, GrandPrix, RaceSession } from '@/api/schemas'
import type { Prefill } from '@/lib/publicData'
import { driverOption } from '@/lib/adminDrivers'
import {
  gridComplete,
  gridPayload,
  gridRows,
  setGridDriver,
  type GridRow,
} from '@/lib/adminSessions'
import { sessionLabel } from '@/lib/gp'
import { controlBase } from '@/components/ui/styles'
import { usePublishGrid, useSessionGrid, useSessionResults } from '@/queries/admin'

/**
 * M5 · «Parrilla» tab. All positions (one per driver of the GP); a driver cannot repeat (choosing
 * one that is used elsewhere swaps the two rows). Empty grids are prefilled with the result of the
 * session that defines them (`defineGridOf`). «Borrador» is always shown: the API has no
 * published/draft state (por confirmar).
 */
const props = defineProps<{
  args: { comp: string; season: string; gp: number }
  sessions: RaceSession[]
  drivers: Driver[]
  gp?: GrandPrix
  selectedId?: number
}>()
const emit = defineEmits<{ select: [id: number]; dirty: [v: boolean] }>()
const { t } = useI18n()

const gridSessions = computed(() => props.sessions.filter((s) => s.hasGrid))
const session = computed(
  () => gridSessions.value.find((s) => s.id === props.selectedId) ?? gridSessions.value[0],
)
const sessionOptions = computed(() =>
  gridSessions.value.map((s) => ({ value: s.id, label: sessionLabel(s).long })),
)

const gridQ = useSessionGrid(
  () => props.args.comp,
  () => props.args.season,
  () => props.args.gp,
  () => session.value?.id,
)
// Prefill source: the first session that defines this grid.
const sourceId = computed(() => {
  const d = session.value?.defineGridOf?.[0]
  return props.sessions.find((s) => s.id === d || s.key === d)?.id
})
const sourceQ = useSessionResults(
  () => props.args.comp,
  () => props.args.season,
  () => props.args.gp,
  sourceId,
)

const n = computed(() => props.drivers.length)
const rows = ref<GridRow[]>([])
const base = ref('')
const snapshot = (r: GridRow[]) => JSON.stringify(r)
watch(
  [() => gridQ.data.value, () => sourceQ.data.value, n, () => session.value?.id],
  () => {
    if (!gridQ.data.value) return
    rows.value = gridRows(n.value, gridQ.data.value, sourceQ.data.value ?? [])
    base.value = snapshot(gridRows(n.value, gridQ.data.value))
  },
  { immediate: true },
)
const dirty = computed(() => snapshot(rows.value) !== base.value)
watch(dirty, (v) => emit('dirty', v))

/** Public data only fills the form (unsaved changes); «Publicar parrilla» is still needed. */
function applyPublic(p: Prefill) {
  rows.value = rows.value.map((r, i) => ({
    ...r,
    driverId: p.drivers[i] ?? null,
    isFromPit: p.isFromPit[i] === true,
  }))
}

const notify = ref(true)
const publish = usePublishGrid(() => props.args)
function onPublish() {
  if (!session.value) return
  publish.mutate(
    { session: session.value.id, grid: gridPayload(rows.value), notify: notify.value },
    { onSuccess: () => (base.value = snapshot(rows.value)) },
  )
}
const options = computed(() => [
  { value: '', label: t('admin.sessions.grid.choose') },
  ...props.drivers.map((d) => ({ value: d.id, label: driverOption(d) })),
])
</script>

<template>
  <p v-if="!gridSessions.length" class="text-muted text-sm">
    {{ t('admin.sessions.grid.noGridSessions') }}
  </p>
  <PCard v-else :padded="false">
    <header class="border-border flex flex-wrap items-start justify-between gap-3 border-b p-4">
      <div class="flex flex-col gap-1">
        <h2 class="t-header text-heading">
          {{
            t('admin.sessions.grid.title', { session: session ? sessionLabel(session).long : '' })
          }}
        </h2>
        <p class="text-muted text-sm">{{ t('admin.sessions.grid.subtitle') }}</p>
      </div>
      <div class="flex items-end gap-3">
        <div v-if="gridSessions.length > 1" class="w-auto">
          <PSelect
            :model-value="session?.id ?? ''"
            :label="t('admin.sessions.grid.session')"
            :options="sessionOptions"
            @update:model-value="(v) => emit('select', Number(v))"
          />
        </div>
        <PTag color="warn">{{ t('admin.sessions.grid.draft') }}</PTag>
      </div>
    </header>
    <div class="flex flex-col gap-3 p-4">
      <PublicFillPanel
        v-if="session && gridQ.data.value"
        :key="session.id"
        purpose="grid"
        :session="session"
        :sessions="sessions"
        :gp="gp"
        :drivers="drivers"
        :current="rows.map((r) => r.driverId)"
        :count="n"
        @apply="applyPublic"
      />
      <ErrorState v-if="gridQ.isError.value" :error="gridQ.error.value" @retry="gridQ.refetch()" />
      <Skeleton v-else-if="!gridQ.data.value" variant="table" :rows="10" />
      <div v-else class="tw">
        <div class="min-w-[640px]">
          <div
            class="text-muted grid grid-cols-[40px_minmax(0,1fr)_110px_minmax(0,1fr)] gap-2 pb-2 text-xs font-semibold tracking-wide uppercase"
          >
            <span>{{ t('admin.sessions.grid.pos') }}</span>
            <span>{{ t('admin.sessions.grid.driver') }}</span>
            <span>{{ t('admin.sessions.grid.pit') }}</span>
            <span>{{ t('admin.sessions.grid.note') }}</span>
          </div>
          <div
            v-for="(r, i) in rows"
            :key="r.position"
            class="grid grid-cols-[40px_minmax(0,1fr)_110px_minmax(0,1fr)] items-center gap-2 py-1"
          >
            <span
              class="bg-surface-muted text-heading flex size-8 items-center justify-center rounded-md text-sm font-bold tabular-nums"
              >{{ r.position }}</span
            >
            <PSelect
              :model-value="r.driverId ?? ''"
              :options="options"
              :aria-label="t('admin.sessions.grid.driverAria', { n: r.position })"
              @update:model-value="
                (v) => (rows = setGridDriver(rows, i, v === '' ? null : Number(v)))
              "
            />
            <PCheckbox
              v-model="r.isFromPit"
              :aria-label="t('admin.sessions.grid.pitAria', { n: r.position })"
              :label="t('admin.sessions.grid.pit')"
            />
            <input
              v-model="r.note"
              type="text"
              :class="controlBase"
              :placeholder="t('admin.sessions.grid.notePlaceholder')"
              :aria-label="t('admin.sessions.grid.noteAria', { n: r.position })"
            />
          </div>
        </div>
      </div>
    </div>
    <footer
      class="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"
    >
      <PCheckbox v-model="notify" :label="t('admin.sessions.grid.notify')" />
      <PButton
        size="sm"
        :loading="publish.isPending.value"
        :disabled="!gridComplete(rows)"
        @click="onPublish"
      >
        {{ t('admin.sessions.grid.publish') }}
      </PButton>
    </footer>
  </PCard>
</template>
