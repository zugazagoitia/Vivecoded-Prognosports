<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import type { Driver, RaceSession, RuleSet } from '@/api/schemas'
import { driverOption } from '@/lib/adminDrivers'
import {
  hasDuplicates,
  hasPrediction,
  isSessionPlayed,
  predictedPositions,
  resultsFromApi,
  resultsPayload,
} from '@/lib/adminSessions'
import { sessionLabel } from '@/lib/gp'
import type { PublicProposal } from '@/composables/usePublicDataFill'
import { useSaveResults, useSessionResults } from '@/queries/admin'

/**
 * M5 · «Resultados» tab: positions 1..N of a session (N = widest `predictedPositions` of the rule
 * sets, else the number of drivers: por confirmar) and the fast lap as position 0, which does not
 * score. Whether the backend calculates points on saving is por confirmar.
 */
const props = defineProps<{
  args: { comp: string; season: string; gp: number }
  sessions: RaceSession[]
  drivers: Driver[]
  rulesets: RuleSet[]
  selectedId?: number
  now: number
}>()
const emit = defineEmits<{ select: [id: number]; dirty: [v: boolean] }>()
// Loaded on demand: the public data layer stays out of the eager bundle.
const PublicDataFill = defineAsyncComponent(() => import('./PublicDataFill.vue'))
const { t } = useI18n()

const predictable = computed(() => props.sessions.filter(hasPrediction))
const session = computed(
  () => predictable.value.find((s) => s.id === props.selectedId) ?? predictable.value[0],
)
const options = computed(() =>
  predictable.value.map((s) => ({ value: s.id, label: sessionLabel(s).short })),
)
const count = computed(() =>
  session.value ? (predictedPositions(session.value, props.rulesets) ?? props.drivers.length) : 0,
)

const resultsQ = useSessionResults(
  () => props.args.comp,
  () => props.args.season,
  () => props.args.gp,
  () => session.value?.id,
)
const rows = ref<(number | null)[]>([])
const fast = ref<number | null>(null)
const base = ref('')
const snap = () => JSON.stringify([rows.value, fast.value])
function load() {
  if (!resultsQ.data.value) return
  const r = resultsFromApi(resultsQ.data.value, count.value)
  rows.value = r.rows
  fast.value = r.fast
  base.value = snap()
}
watch([() => resultsQ.data.value, count, () => session.value?.id], load, { immediate: true })
const dirty = computed(() => snap() !== base.value)
watch(dirty, (v) => emit('dirty', v))

const played = computed(() => isSessionPlayed(session.value?.date, props.now))
const saved = computed(() => (resultsQ.data.value?.length ?? 0) > 0)
const duplicate = computed(() => hasDuplicates(rows.value))
const complete = computed(() => rows.value.length > 0 && rows.value.every((r) => r != null))
const save = useSaveResults(() => props.args)
function onSave() {
  if (!session.value) return
  save.mutate(
    { session: session.value.id, ...resultsPayload(rows.value, fast.value) },
    { onSuccess: () => (base.value = snap()) },
  )
}
function opts(current: number | null, chosen: readonly (number | null)[], label: string) {
  return [
    { value: '', label },
    ...props.drivers.map((d) => ({
      value: d.id,
      label: driverOption(d),
      disabled: d.id !== current && chosen.includes(d.id),
    })),
  ]
}
const rowOptions = (i: number) =>
  opts(rows.value[i] ?? null, rows.value, t('admin.sessions.grid.choose'))
const fastOptions = computed(() => [
  { value: '', label: t('admin.sessions.grid.choose') },
  ...props.drivers.map((d) => ({ value: d.id, label: driverOption(d) })),
])
/** Applies a public proposal to the local form: unsaved until «Guardar». */
function applyPublic(p: PublicProposal) {
  rows.value = p.driverIds.slice()
  fast.value = p.fastLap
}
function clearAll() {
  rows.value = rows.value.map(() => null)
  fast.value = null
}
const set = (i: number, v: string | number) => (rows.value[i] = v === '' ? null : Number(v))
</script>

<template>
  <p v-if="!predictable.length" class="text-muted text-sm">
    {{ t('admin.sessions.results.noPredSessions') }}
  </p>
  <PCard v-else :padded="false">
    <header class="border-border flex flex-wrap items-start justify-between gap-3 border-b p-4">
      <div class="flex flex-col gap-1">
        <h2 class="t-header text-heading">{{ t('admin.sessions.results.title') }}</h2>
        <p class="text-muted text-sm">{{ t('admin.sessions.results.subtitle') }}</p>
      </div>
      <SegmentedControl
        :model-value="session?.id ?? 0"
        :options="options"
        :label="t('admin.sessions.results.session')"
        @update:model-value="(v) => emit('select', Number(v))"
      />
    </header>
    <div class="flex flex-col gap-3 p-4">
      <ErrorState
        v-if="resultsQ.isError.value"
        :error="resultsQ.error.value"
        @retry="resultsQ.refetch()"
      />
      <Skeleton v-else-if="!resultsQ.data.value" variant="table" :rows="10" />
      <template v-else>
        <PublicDataFill
          :args="args"
          mode="results"
          :session="session"
          :drivers="drivers"
          :slots="count"
          :current="rows"
          :current-fast="fast"
          @apply="applyPublic"
        />
        <div v-for="(_, i) in rows" :key="i" class="flex items-center gap-2">
          <span
            class="bg-surface-muted text-heading flex size-8 flex-none items-center justify-center rounded-md text-sm font-bold tabular-nums"
            >{{ i + 1 }}</span
          >
          <div class="min-w-0 flex-1">
            <PSelect
              :model-value="rows[i] ?? ''"
              :options="rowOptions(i)"
              :aria-label="t('admin.sessions.results.position', { n: i + 1 })"
              @update:model-value="(v) => set(i, v)"
            />
          </div>
        </div>
        <div class="max-w-90">
          <PSelect
            :model-value="fast ?? ''"
            :label="t('admin.sessions.results.fastLap')"
            :options="fastOptions"
            @update:model-value="(v) => (fast = v === '' ? null : Number(v))"
          />
        </div>
        <p v-if="duplicate" role="alert" class="text-err text-sm">
          {{ t('admin.sessions.results.duplicates') }}
        </p>
        <PrognoAlert
          v-if="saved && !dirty"
          variant="ok"
          :title="t('admin.sessions.results.saved')"
        />
        <PrognoAlert
          v-else-if="!played"
          variant="warn"
          :title="t('admin.sessions.results.notPlayed')"
        />
      </template>
    </div>
    <footer class="border-border flex justify-end gap-2 border-t px-4 py-3">
      <PButton variant="outline" size="sm" @click="clearAll">{{
        t('admin.sessions.results.clear')
      }}</PButton>
      <PButton
        size="sm"
        :loading="save.isPending.value"
        :disabled="!played || !complete || duplicate"
        @click="onSave"
      >
        {{ t('admin.sessions.results.save') }}
      </PButton>
    </footer>
  </PCard>
</template>
