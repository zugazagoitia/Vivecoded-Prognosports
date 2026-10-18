<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PSelect from '@/components/ui/PSelect.vue'
import {
  calendarDiff,
  findCircuit,
  type CalendarCurrent,
  type CalendarWarning,
} from '@/lib/publicData/calendar'
import { usePublicCalendarProposal, usePublicSeasonRaces } from '@/queries/publicCalendar'

/**
 * «Rellenar desde calendario público» (issue 202, GP data). Pre-fills name, round and circuit of the
 * GP form; nothing is saved here («Guardar» does that). Loaded on demand from GpEditor.
 */
const props = defineProps<{
  season: number | undefined
  /** The form as it is now. */
  current: CalendarCurrent
  circuits: readonly { id: number; name: string | null }[]
}>()
const emit = defineEmits<{
  apply: [change: { name?: string; round?: string; circuitId?: number }]
}>()
const { t, locale } = useI18n()

const requested = ref(false)
const round = ref('')

const races = usePublicSeasonRaces(() => (requested.value ? props.season : undefined))
const roundOptions = computed(() =>
  (races.data.value ?? []).map((r) => ({
    value: r.round,
    label: `${t('publicCalendar.sessions.round', { round: r.round })} · ${r.raceName}`,
  })),
)

const proposal = usePublicCalendarProposal(() =>
  requested.value && props.season != null && round.value !== ''
    ? { season: props.season, round: Number(round.value) }
    : undefined,
)

/** Round to fill: the form's round if it is in the season, else the next race by date. */
watch(
  () => races.data.value,
  (list) => {
    if (!list?.length || round.value !== '') return
    const known = list.some((r) => r.round === props.current.round.trim())
    const today = new Date().toISOString().slice(0, 10)
    const next = list.find((r) => r.date >= today) ?? list[list.length - 1]!
    round.value = known ? props.current.round.trim() : next.round
  },
)

const diff = computed(() =>
  proposal.data.value
    ? calendarDiff(proposal.data.value, { ...props.current, sessions: [] })
    : undefined,
)
const circuitMatch = computed(() =>
  proposal.data.value ? findCircuit(proposal.data.value.gp.circuit, props.circuits) : undefined,
)
const noCircuit = computed(
  () => !!diff.value?.gp.some((c) => c.field === 'circuit') && !circuitMatch.value,
)

const sourceLine = computed(() => {
  const p = proposal.data.value
  if (!p) return ''
  return t('publicCalendar.source', {
    sources: p.sources.map((s) => t(`publicCalendar.sources.${s}`)).join(' + '),
    time: new Date(p.fetchedAt).toLocaleString(locale.value),
  })
})

const warningText = (w: CalendarWarning) => {
  switch (w.kind) {
    case 'cancelled':
      return t('publicCalendar.warnings.cancelled')
    case 'moved':
      return t('publicCalendar.warnings.moved', { from: w.from, to: w.to })
    case 'time-conflict':
      return t('publicCalendar.warnings.timeConflict', { code: w.code })
    case 'openf1-missing':
      return t('publicCalendar.warnings.openf1Missing')
  }
}

const sprintText = computed(() =>
  proposal.data.value?.gp.sprint
    ? t('publicCalendar.gp.sprintYes')
    : t('publicCalendar.gp.sprintNo'),
)

const fieldLabel = (field: 'name' | 'round' | 'circuit') => t(`publicCalendar.gp.field.${field}`)
const show = (value: string) => value || t('publicCalendar.gp.emptyValue')

function open() {
  requested.value = true
}
function close() {
  requested.value = false
  round.value = ''
}

function onApply() {
  const p = proposal.data.value
  const d = diff.value
  if (!p || !d) return
  const change: { name?: string; round?: string; circuitId?: number } = {}
  if (d.gp.some((c) => c.field === 'name')) change.name = p.gp.name
  if (d.gp.some((c) => c.field === 'round')) change.round = String(p.gp.round)
  if (circuitMatch.value && d.gp.some((c) => c.field === 'circuit')) {
    change.circuitId = Number(circuitMatch.value.id)
  }
  emit('apply', change)
  close()
}
</script>

<template>
  <div class="flex w-full flex-col gap-3">
    <div class="flex justify-end">
      <PButton variant="outline" size="sm" :disabled="requested" @click="open">
        {{ t('publicCalendar.open') }}
      </PButton>
    </div>

    <section
      v-if="requested"
      :aria-label="t('publicCalendar.gp.title')"
      class="border-border bg-surface-muted flex flex-col gap-3 rounded-md border p-3 text-sm"
    >
      <p class="text-muted">{{ t('publicCalendar.hint') }}</p>

      <PSelect
        v-model="round"
        :label="t('publicCalendar.round')"
        :options="roundOptions"
        :placeholder="t('publicCalendar.roundPlaceholder')"
      />

      <p v-if="proposal.isLoading.value" role="status" class="text-muted">
        {{ t('publicCalendar.loading') }}
      </p>

      <div v-else-if="proposal.isError.value" class="flex flex-wrap items-center gap-3">
        <p role="alert" class="text-err">{{ t('publicCalendar.error') }}</p>
        <PButton variant="outline" size="sm" @click="proposal.refetch()">
          {{ t('publicCalendar.retry') }}
        </PButton>
        <PButton variant="outline" size="sm" @click="close">
          {{ t('publicCalendar.close') }}
        </PButton>
      </div>

      <template v-else-if="proposal.data.value && diff">
        <p class="text-muted">{{ sourceLine }}</p>

        <div v-if="proposal.data.value.warnings.length" class="flex flex-col gap-1">
          <h3 class="text-heading font-semibold">{{ t('publicCalendar.warnings.title') }}</h3>
          <ul class="text-err flex flex-col gap-1">
            <li v-for="(w, i) in proposal.data.value.warnings" :key="i">{{ warningText(w) }}</li>
          </ul>
        </div>

        <div class="flex flex-col gap-1">
          <h3 class="text-heading font-semibold">{{ t('publicCalendar.gp.changes') }}</h3>
          <p v-if="!diff.gp.length" class="text-muted">{{ t('publicCalendar.gp.noChanges') }}</p>
          <ul v-else class="flex flex-col gap-1 tabular-nums">
            <li v-for="c in diff.gp" :key="c.field">
              {{
                t('publicCalendar.gp.change', {
                  field: fieldLabel(c.field),
                  from: show(c.from),
                  to: c.to,
                })
              }}
            </li>
          </ul>
          <p v-if="noCircuit" class="text-muted">{{ t('publicCalendar.gp.noCircuit') }}</p>
          <p class="text-muted">{{ t('publicCalendar.gp.sprint', { value: sprintText }) }}</p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-muted text-xs">{{ t('publicCalendar.applyHint') }}</p>
          <div class="flex gap-2">
            <PButton variant="outline" size="sm" @click="close">
              {{ t('publicCalendar.close') }}
            </PButton>
            <PButton size="sm" :disabled="!diff.gp.length" @click="onApply">
              {{ t('publicCalendar.apply') }}
            </PButton>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
