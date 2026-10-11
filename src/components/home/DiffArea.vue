<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { signedLabel } from '@/lib/home'
import { useHome } from './useHome'

/** Phone: only the «difference with the leader» mode, as an area (340 x 140) with the end value. */
const { t } = useI18n()
const home = useHome()
const s = computed(() => home.standing)

const W = 340
const H = 140
const PL = 8
const PR = 56
const PT = 22
const PB = 22

const line = computed(() => s.value.model('leader').lines[0])
const gps = computed(() => s.value.standing.gps)
const n = computed(() => gps.value.length)
const values = computed(() => line.value?.values ?? [])
const min = computed(() => Math.min(0, ...values.value))
const x = (i: number) =>
  n.value <= 1 ? PL + (W - PL - PR) / 2 : PL + (i * (W - PL - PR)) / (n.value - 1)
const y = (v: number) => PT + ((0 - v) / (0 - min.value || 1)) * (H - PT - PB)
const path = computed(() => values.value.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(''))
const area = computed(() =>
  values.value.length ? `${path.value}L${x(n.value - 1)},${y(0)}L${x(0)},${y(0)}Z` : '',
)
const last = computed(() => values.value[n.value - 1] ?? 0)
const alt = computed(() => t('home.mobile.diffAlt', { value: signedLabel(last.value) }))
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex flex-col gap-2 rounded-lg p-4 shadow-(--card-shadow) ring-1"
    aria-labelledby="home-diff-title"
  >
    <h2 id="home-diff-title" class="text-heading m-0 text-base font-semibold">
      {{ t('home.mobile.diffTitle') }}
    </h2>
    <Skeleton v-if="s.isLoading" variant="chart" />
    <ErrorState
      v-else-if="s.isError"
      :what="t('home.chart.error')"
      :error="s.error"
      @retry="s.refetch()"
    />
    <EmptyState
      v-else-if="!n"
      icon="show_chart"
      :title="t('home.chart.empty.title')"
      :text="t('home.chart.empty.text')"
    />
    <template v-else>
      <svg
        class="bg-chart-surface block h-auto w-full rounded-lg"
        :viewBox="`0 0 ${W} ${H}`"
        role="img"
        :aria-label="alt"
      >
        <g aria-hidden="true">
          <path :d="area" class="fill-tint" />
          <line
            :x1="PL"
            :x2="W - PR"
            :y1="y(0)"
            :y2="y(0)"
            class="stroke-axis"
            stroke-width="1.5"
          />
          <text :x="W - PR + 8" :y="y(0) + 4" font-size="11" class="fill-axis-txt">
            {{ t('home.mobile.leaderLabel') }}
          </text>
          <path
            :d="path"
            fill="none"
            stroke-width="2.5"
            stroke-linejoin="round"
            stroke-linecap="round"
            class="stroke-series-you"
          />
          <circle :cx="x(n - 1)" :cy="y(last)" r="4" class="fill-series-you" />
          <text
            :x="x(n - 1) + 8"
            :y="y(last) + 4"
            font-size="12"
            font-weight="600"
            class="fill-series-you tabular-nums"
          >
            {{ signedLabel(last) }}
          </text>
          <text :x="x(0)" :y="H - 6" font-size="11" class="fill-axis-txt">{{ gps[0]?.code }}</text>
          <text
            v-if="n > 1"
            :x="x(n - 1)"
            :y="H - 6"
            text-anchor="middle"
            font-size="11"
            class="fill-axis-txt"
          >
            {{ gps[n - 1]?.code }}
          </text>
        </g>
      </svg>
      <table class="sr-only">
        <caption>
          {{
            t('home.mobile.diffTitle')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('home.bySession.gp') }}</th>
            <th scope="col">{{ t('home.chart.you') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(g, i) in gps" :key="g.id">
            <th scope="row">{{ g.name }}</th>
            <td>{{ signedLabel(values[i] ?? 0) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>
