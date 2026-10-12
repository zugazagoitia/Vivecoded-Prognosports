<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaceSession, RuleSet } from '@/api/schemas'
import { EmptyState } from '@/components/states'
import { formatPoints, sessionLabel } from '@/lib/gp'
import { maxPossible, rulesOf, type Rules } from '@/lib/results'
import CommunityCard from './CommunityCard.vue'

/**
 * «Reglas» card: the 8 scoring concepts per session (columns) of the community's rule set, and
 * the maximum per session without bonus (predicted positions x points of each exact hit).
 *
 * Props: `ruleset` (`RuleSet`), `sessions` (columns, in order: `seasonSessions(gps)`), `season`
 * (label), `loading`, `error`. Emits `retry`. Values missing for a session show «—». The exact
 * hit is a range when the points differ by position («10–20»). The bonus (`pointsByTopScorer`)
 * is one number per rule set, repeated in every column.
 */
const props = defineProps<{
  ruleset?: RuleSet
  sessions: readonly RaceSession[]
  season?: string
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()

const columns = computed(() =>
  props.sessions.map((s) => ({
    id: s.id,
    label: sessionLabel(s).long,
    rules: rulesOf(props.ruleset?.data, s),
  })),
)

function exact(r: Rules | undefined): string {
  const v = Object.values(r?.equals ?? {})
  if (!v.length) return '—'
  const lo = Math.min(...v)
  const hi = Math.max(...v)
  return lo === hi ? formatPoints(hi) : `${formatPoints(lo)}–${formatPoints(hi)}`
}
const num = (n: number | undefined) => (n == null ? '—' : formatPoints(n))

const concepts = [
  { key: 'exact', value: exact },
  { key: 'next', value: (r?: Rules) => num(r?.next) },
  { key: 'previous', value: (r?: Rules) => num(r?.previous) },
  { key: 'nextOfFollowing', value: (r?: Rules) => num(r?.nextOfFollowing) },
  { key: 'previousOfPrevious', value: (r?: Rules) => num(r?.previousOfPrevious) },
  { key: 'notInPodium', value: (r?: Rules) => num(r?.notInPodium) },
  { key: 'notInResults', value: (r?: Rules) => num(r?.notInResults) },
  { key: 'bonus', value: (r?: Rules) => num(r?.topScorer) },
] as const

function max(r: Rules | undefined): string {
  if (!r) return '—'
  const n = r.predicted ?? Object.keys(r.equals).length
  return num(maxPossible(r, n))
}
const title = computed(() =>
  props.ruleset?.displayname
    ? t('community.rules.title', { name: props.ruleset.displayname })
    : t('community.rules.titleBare'),
)
const th = 'table-head bg-surface-muted text-muted border-border border-b px-3 py-2.5'
const td = 'border-border text-body border-b px-3 py-2.5'
</script>

<template>
  <CommunityCard
    :title="title"
    :loading="loading"
    :error="error"
    :what="t('community.error.rules')"
    :rows="8"
    flush
    @retry="$emit('retry')"
  >
    <template v-if="season" #aside>
      <span class="text-muted text-sm">{{ t('community.rules.season', { season }) }}</span>
    </template>
    <div
      v-if="ruleset && columns.length"
      class="overflow-x-auto"
      tabindex="0"
      role="region"
      :aria-label="t('community.rules.table')"
    >
      <table class="w-full border-collapse text-sm leading-5">
        <caption class="sr-only">
          {{
            t('community.rules.table')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" :class="[th, 'text-left']">{{ t('community.rules.hit') }}</th>
            <th v-for="c in columns" :key="c.id" scope="col" :class="[th, 'text-right']">
              {{ c.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in concepts" :key="row.key">
            <th scope="row" :class="[td, 'text-left font-normal']">
              {{ t(`community.rules.${row.key}`) }}
            </th>
            <td v-for="c in columns" :key="c.id" :class="[td, 'text-right tabular-nums']">
              {{ row.value(c.rules) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" :class="[td, 'text-heading text-left font-semibold']">
              {{ t('community.rules.max') }}
            </th>
            <td
              v-for="c in columns"
              :key="c.id"
              :class="[td, 'text-heading text-right font-semibold tabular-nums']"
            >
              {{ max(c.rules) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <EmptyState
      v-else
      icon="rule"
      :title="t('community.rules.none')"
      :text="t('community.rules.noneText')"
    />
    <template #footer>
      <span class="text-muted mr-auto text-sm">{{ t('community.rules.footnote') }}</span>
    </template>
  </CommunityCard>
</template>
