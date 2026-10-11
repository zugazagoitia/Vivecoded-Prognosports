<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { focusRing } from '@/components/ui/styles'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import FlagBadge from '@/flags/FlagBadge.vue'
import { useFlag } from '@/flags'
import { chartMax } from '@/lib/profile'
import { formatNumber } from '@/utils/numbers'
import { useProfile } from './useProfile'

/**
 * «Tu temporada»: one column per played GP with the community range (min–max), my bar and the
 * median mark. The bar of the GPs I won uses `brand-800`. Pure SVG like the other charts (F5):
 * pressable GP axis with a value panel, and the same numbers as a table.
 */
const { t } = useI18n()
const profile = useProfile()
const st = computed(() => profile.standing)
const mySeasonOn = useFlag('MY_SEASON')
const gps = computed(() => st.value.standing.gps)
const cols = computed(() => profile.summary.columns)
const max = computed(() => chartMax(cols.value))

const view = ref<'chart' | 'table'>('chart')
const viewOptions = computed(() => [
  { value: 'chart' as const, label: t('profile.season.chart') },
  { value: 'table' as const, label: t('profile.season.table') },
])
const pinned = ref<number | null>(null)
const hover = ref<number | null>(null)
const active = computed(() => hover.value ?? pinned.value ?? gps.value.length - 1)

const W = 1000
const H = 220
const X0 = 48
const step = computed(() => Math.min(56, (W - X0 - 8) / Math.max(gps.value.length, 1)))
const colW = computed(() => step.value * (44 / 56))
const x = (g: number) => X0 + g * step.value
const y = (v: number) => 196 - (v / max.value) * 186
const ticks = computed(() => [0, 0.5, 1].map((f) => Math.round(f * max.value)))
const left = (g: number) => `${((x(g) + colW.value / 2) / W) * 100}%`

const panel = computed(() => {
  const c = cols.value[active.value]
  const name = gps.value[active.value]?.name ?? ''
  if (!c) return ''
  const common = {
    name,
    min: formatNumber(c.min),
    max: formatNumber(c.max),
    median: formatNumber(c.median),
  }
  return c.mine == null
    ? t('profile.season.panelNoMine', common)
    : t('profile.season.panel', { ...common, mine: formatNumber(c.mine) })
})
const mySeasonTo = computed(() =>
  profile.scope.activeId != null && profile.scope.seasonId != null
    ? `/ranking/${profile.scope.activeId}/${profile.scope.seasonId}/comparar/mi-temporada`
    : undefined,
)
function pin(i: number) {
  pinned.value = pinned.value === i ? null : i
}
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex min-w-0 flex-col gap-4 rounded-lg p-5 shadow-(--card-shadow) ring-1"
    aria-labelledby="profile-season-title"
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h2 id="profile-season-title" class="text-heading m-0 text-base font-semibold">
          {{ t('profile.season.title') }}
        </h2>
        <FlagBadge v-if="mySeasonOn" />
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <SegmentedControl
          v-if="gps.length"
          v-model="view"
          :options="viewOptions"
          :label="t('profile.season.view')"
        />
        <RouterLink
          v-if="mySeasonOn && mySeasonTo"
          :to="mySeasonTo"
          class="text-link text-sm font-medium"
          :class="focusRing"
        >
          {{ t('profile.season.link') }}
        </RouterLink>
      </div>
    </header>

    <Skeleton v-if="st.isLoading" variant="chart" />
    <ErrorState
      v-else-if="st.isError"
      :what="t('profile.season.error')"
      :error="st.error"
      @retry="st.refetch()"
    />
    <EmptyState
      v-else-if="!gps.length"
      icon="show_chart"
      :title="t('profile.season.empty.title')"
      :text="t('profile.season.empty.text')"
    />
    <template v-else-if="view === 'chart'">
      <div class="bg-chart-surface rounded-lg">
        <svg
          class="block h-auto w-full"
          :viewBox="`0 0 ${W} ${H}`"
          role="img"
          :aria-label="t('profile.season.alt')"
          preserveAspectRatio="xMidYMid meet"
        >
          <g aria-hidden="true">
            <g v-for="tk in ticks" :key="tk">
              <line :x1="X0 - 8" :x2="W" :y1="y(tk)" :y2="y(tk)" class="stroke-grid" />
              <text
                :x="X0 - 14"
                :y="y(tk) + 4"
                text-anchor="end"
                class="fill-axis-txt tabular-nums"
                font-size="11"
              >
                {{ formatNumber(tk) }}
              </text>
            </g>
            <g v-for="(c, g) in cols" :key="gps[g]?.id">
              <rect
                :x="x(g)"
                :y="y(c.max)"
                :width="colW"
                :height="Math.max(y(c.min) - y(c.max), 2)"
                rx="4"
                class="fill-surface-muted"
              />
              <rect
                v-if="c.mine != null"
                :x="x(g) + colW * 0.2"
                :y="y(c.mine)"
                :width="colW * 0.6"
                :height="Math.max(y(0) - y(c.mine), 1)"
                rx="3"
                :class="c.won ? 'fill-brand-800' : 'fill-series-you'"
              />
              <line
                :x1="x(g)"
                :x2="x(g) + colW"
                :y1="y(c.median)"
                :y2="y(c.median)"
                stroke-width="2"
                class="stroke-heading"
              />
            </g>
          </g>
        </svg>
        <div class="relative h-11" role="group" :aria-label="t('profile.season.axis')">
          <button
            v-for="(g, i) in gps"
            :key="g.id"
            type="button"
            class="text-muted hover:bg-surface-muted aria-pressed:bg-tint aria-pressed:text-tint-fg absolute top-0 h-11 min-w-8 -translate-x-1/2 cursor-pointer rounded-md px-0 text-[11px] leading-4"
            :class="focusRing"
            :style="{ left: left(i) }"
            :aria-pressed="pinned === i"
            :aria-label="t('profile.season.pin', { name: g.name })"
            @click="pin(i)"
            @pointerenter="(e) => e.pointerType === 'mouse' && (hover = i)"
            @pointerleave="(e) => e.pointerType === 'mouse' && (hover = null)"
          >
            <span aria-hidden="true">{{ g.code }}</span>
          </button>
        </div>
      </div>
      <p class="text-body m-0 text-[13px]" aria-live="polite" aria-atomic="true">{{ panel }}</p>
      <ul class="text-muted m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs">
        <li class="flex items-center gap-1.5">
          <span class="bg-series-you inline-block size-3 rounded-sm" aria-hidden="true" />
          {{ t('profile.season.legendYou') }}
        </li>
        <li class="flex items-center gap-1.5">
          <span
            class="bg-surface-muted ring-border inline-block size-3 rounded-sm ring-1"
            aria-hidden="true"
          />
          {{ t('profile.season.legendRange') }}
        </li>
        <li class="flex items-center gap-1.5">
          <span class="bg-heading inline-block h-0.5 w-4" aria-hidden="true" />
          {{ t('profile.season.legendMedian') }}
        </li>
      </ul>
    </template>
    <div
      v-else
      class="overflow-x-auto"
      role="region"
      aria-labelledby="profile-season-title"
      tabindex="0"
    >
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('profile.season.tableCaption')
          }}
        </caption>
        <thead>
          <tr class="text-muted text-xs font-semibold">
            <th scope="col" class="p-2 text-left">{{ t('profile.season.colGp') }}</th>
            <th scope="col" class="p-2 text-right">{{ t('profile.season.colMine') }}</th>
            <th scope="col" class="p-2 text-right">{{ t('profile.season.colMin') }}</th>
            <th scope="col" class="p-2 text-right">{{ t('profile.season.colMax') }}</th>
            <th scope="col" class="p-2 text-right">{{ t('profile.season.colMedian') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, i) in cols" :key="gps[i]?.id" class="border-border border-t">
            <th scope="row" class="text-heading p-2 text-left font-semibold">{{ gps[i]?.name }}</th>
            <td class="p-2 text-right">{{ c.mine != null ? formatNumber(c.mine) : '—' }}</td>
            <td class="p-2 text-right">{{ formatNumber(c.min) }}</td>
            <td class="p-2 text-right">{{ formatNumber(c.max) }}</td>
            <td class="p-2 text-right">{{ formatNumber(c.median) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
