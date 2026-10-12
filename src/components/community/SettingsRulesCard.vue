<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaceSession, RuleSet } from '@/api/schemas'
import { EmptyState } from '@/components/states'
import PTag from '@/components/ui/PTag.vue'
import { usagesText } from '@/lib/community-settings'
import { formatPoints, sessionLabel } from '@/lib/gp'
import { rulesOf, type Rules } from '@/lib/results'
import CommunityCard from './CommunityCard.vue'

/**
 * «Reglas de puntuación» block of the settings (H6), read-only: the 8 scoring concepts (rows) per
 * session (columns, like H5's «Reglas» tab since the real rule set is keyed by session) and the
 * footnote «Conjunto «X», público y usado por N comunidades.».
 *
 * Props: `ruleset`, `sessions` (columns), `usages` (count, null/undefined = unknown), `loading`,
 * `error`. Emits `retry`.
 */
const props = defineProps<{
  ruleset?: RuleSet
  sessions: readonly RaceSession[]
  usages?: number | null
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
const th = 'table-head bg-surface-muted text-muted border-border border-b px-3 py-2.5'
const td = 'border-border text-body border-b px-3 py-2.5'
</script>

<template>
  <CommunityCard
    :title="t('communitySettings.rules.title')"
    :loading="loading"
    :error="error"
    :what="t('communitySettings.error.rules')"
    :rows="8"
    flush
    @retry="$emit('retry')"
  >
    <template #aside>
      <PTag icon="lock">{{ t('communitySettings.readOnly') }}</PTag>
    </template>
    <div
      v-if="ruleset && columns.length"
      class="overflow-x-auto"
      tabindex="0"
      role="region"
      :aria-label="t('communitySettings.rules.table')"
    >
      <table class="w-full border-collapse text-sm leading-5">
        <caption class="sr-only">
          {{
            t('communitySettings.rules.table')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" :class="[th, 'text-left']">{{ t('communitySettings.rules.hit') }}</th>
            <th v-for="c in columns" :key="c.id" scope="col" :class="[th, 'text-right']">
              {{ c.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in concepts" :key="row.key">
            <th scope="row" :class="[td, 'text-left font-normal']">
              {{ t(`communitySettings.rules.${row.key}`) }}
            </th>
            <td
              v-for="c in columns"
              :key="c.id"
              :class="[td, 'text-heading text-right font-bold tabular-nums']"
            >
              {{ row.value(c.rules) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState
      v-else
      icon="rule"
      :title="t('communitySettings.rules.none')"
      :text="t('communitySettings.rules.noneText')"
    />
    <template v-if="ruleset?.displayname" #footer>
      <span class="text-muted mr-auto text-sm">{{
        usagesText(ruleset.displayname, ruleset.public, usages ?? undefined)
      }}</span>
    </template>
  </CommunityCard>
</template>
