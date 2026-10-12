<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormStrip from '@/components/community/FormStrip.vue'
import { EmptyState } from '@/components/states'
import type { FormEntry } from '@/lib/community'
import { CHART_H, CHART_W, diffChart, endLabel, type Duel } from '@/lib/userProfile'
import { formatNumber, formatSigned } from '@/utils/numbers'

/**
 * «Vuestro duelo en {año}» (U2): score of GP won, cumulative points difference (area chart
 * with the zero line and an end label) and the form of both users. Purely presentational.
 * Props: `year`, `name` (rival), `meLabel`/`themLabel` («Tú · 3.º»), `meTotal`/`themTotal` (pts),
 * `duel`, `cum` (cumulative difference per GP), `gpNames`, `mine`/`theirs` (points per GP),
 * `meForm`/`themForm`.
 */
const props = defineProps<{
  year: string
  name: string
  meLabel: string
  themLabel: string
  meTotal: string
  themTotal: string
  duel: Duel
  cum: number[]
  gpNames: string[]
  mine: number[]
  theirs: number[]
  meForm: FormEntry[]
  themForm: FormEntry[]
}>()
const { t } = useI18n()

const ties = computed(() => {
  const n = props.duel.ties
  return n === 0
    ? t('userProfile.duel.tiesNone')
    : n === 1
      ? t('userProfile.duel.tiesOne')
      : t('userProfile.duel.tiesMany', { n })
})
const scoreSr = computed(() =>
  t('userProfile.duel.scoreSr', {
    wa: props.duel.wa,
    ties: ties.value,
    wb: props.duel.wb,
    name: props.name,
  }),
)
const chart = computed(() => diffChart(props.cum))
const label = computed(() =>
  endLabel(props.cum.at(-1) ?? 0, props.name, {
    you: (n) => t('userProfile.duel.endYou', { n }),
    them: (n, name) => t('userProfile.duel.endThem', { n, name }),
    tie: t('userProfile.duel.endTie'),
  }),
)
const labelY = computed(() => {
  const c = chart.value
  if (!c) return 0
  return (props.cum.at(-1) ?? 0) >= 0 ? c.last.y - 8 : c.last.y + 16
})
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex min-w-0 flex-col gap-4 rounded-lg p-4 shadow-(--card-shadow) ring-1 sm:p-5"
    aria-labelledby="profile-duel-title"
  >
    <header class="flex flex-col gap-0.5">
      <h2 id="profile-duel-title" class="t-subtitle text-heading m-0">
        {{ t('userProfile.duel.title', { year }) }}
      </h2>
      <p class="text-muted m-0 text-sm">{{ t('userProfile.duel.subtitle') }}</p>
    </header>

    <div
      class="bg-surface-muted grid grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-2 rounded-lg px-3 py-4 sm:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] sm:gap-4 sm:px-5"
      data-testid="duel-score"
    >
      <p class="m-0 flex flex-col text-right">
        <span class="text-muted text-sm">{{ meLabel }}</span>
        <b class="text-series-you text-xl">{{ t('userProfile.duel.pts', { n: meTotal }) }}</b>
      </p>
      <p class="m-0 flex items-baseline justify-center gap-2 sm:gap-3">
        <span class="sr-only">{{ scoreSr }}</span>
        <b
          class="text-series-you text-[32px] leading-10 font-bold tabular-nums sm:text-[44px] sm:leading-12"
          aria-hidden="true"
          >{{ duel.wa }}</b
        >
        <span class="text-muted text-sm" aria-hidden="true">{{ ties }}</span>
        <b
          class="text-heading border-series-2 border-b-4 text-[32px] leading-10 font-bold tabular-nums sm:text-[44px] sm:leading-12"
          aria-hidden="true"
          >{{ duel.wb }}</b
        >
      </p>
      <p class="m-0 flex flex-col">
        <span class="text-muted text-sm">{{ themLabel }}</span>
        <b class="text-heading border-series-2 w-fit border-b-4 text-xl">{{
          t('userProfile.duel.pts', { n: themTotal })
        }}</b>
      </p>
    </div>

    <template v-if="chart">
      <svg
        class="bg-chart-surface block h-auto w-full rounded-lg"
        :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
        role="img"
        :aria-label="t('userProfile.duel.chartAlt', { name, label })"
      >
        <g aria-hidden="true">
          <path :d="chart.area" class="fill-tint" />
          <line
            x1="10"
            :x2="CHART_W - 10"
            :y1="chart.zeroY"
            :y2="chart.zeroY"
            class="stroke-axis"
            stroke-width="1.5"
            stroke-dasharray="4 4"
          />
          <path
            :d="chart.line"
            fill="none"
            stroke-width="2.5"
            stroke-linejoin="round"
            stroke-linecap="round"
            class="stroke-series-you"
          />
          <text
            :x="CHART_W - 4"
            :y="labelY"
            text-anchor="end"
            font-size="13"
            font-weight="600"
            class="fill-heading"
          >
            {{ label }}
          </text>
        </g>
      </svg>
      <table class="sr-only">
        <caption>
          {{
            t('userProfile.duel.tableCaption', { name })
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('userProfile.duel.colGp') }}</th>
            <th scope="col">{{ t('userProfile.duel.colYou') }}</th>
            <th scope="col">{{ t('userProfile.duel.colThem', { name }) }}</th>
            <th scope="col">{{ t('userProfile.duel.colDiff') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(g, i) in gpNames" :key="i">
            <th scope="row">{{ g }}</th>
            <td>{{ formatNumber(mine[i] ?? 0, 1) }}</td>
            <td>{{ formatNumber(theirs[i] ?? 0, 1) }}</td>
            <td>{{ formatSigned(cum[i] ?? 0) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
    <EmptyState
      v-else
      icon="show_chart"
      :title="t('userProfile.duel.chartEmptyTitle')"
      :text="t('userProfile.duel.chartEmptyText')"
    />

    <div class="flex flex-wrap gap-x-6 gap-y-3">
      <div class="flex flex-col gap-1">
        <span class="text-muted text-xs font-semibold tracking-wide uppercase">{{
          t('userProfile.duel.formYou')
        }}</span>
        <FormStrip :entries="meForm" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-muted text-xs font-semibold tracking-wide uppercase">{{
          t('userProfile.duel.formThem')
        }}</span>
        <FormStrip :entries="themForm" />
      </div>
    </div>
  </section>
</template>
