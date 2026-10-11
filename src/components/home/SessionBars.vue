<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { sessionStacks, STACK_ORDER, type StackKey } from '@/lib/home'
import { formatNumber } from '@/utils/numbers'
import { useHome } from './useHome'

/**
 * Points per GP stacked by session (flag POINTS_BY_SESSION). The scale is shared by all GPs
 * (the real maximum, not the mockup's fixed 62) and zero segments are not drawn.
 */
const { t } = useI18n()
const home = useHome()

const stacks = computed(() =>
  sessionStacks(home.standing.standing, home.scope.userId, home.standing.gps),
)

const W = 1000
const H = 120
const LABEL = 16
const FILL: Record<StackKey, string> = {
  q: 'fill-series-2',
  cs: 'fill-series-6',
  sp: 'fill-series-3',
  r: 'fill-series-4',
  bonus: 'fill-series-5',
}
const SWATCH: Record<StackKey, string> = {
  q: 'bg-series-2',
  cs: 'bg-series-6',
  sp: 'bg-series-3',
  r: 'bg-series-4',
  bonus: 'bg-series-5',
}

const bars = computed(() => {
  const { bars: list, max } = stacks.value
  const slot = W / Math.max(list.length, 1)
  const bw = Math.min(40, slot * 0.6)
  const h = H - LABEL
  return list.map((b, i) => {
    let y = h
    const segs = b.segments.map((sg) => {
      const sh = max > 0 ? (Math.abs(sg.value) / max) * (h - 4) : 0
      y -= sh
      return { key: sg.key, y, h: sh }
    })
    return { gp: b.gp, x: slot * i + (slot - bw) / 2, w: bw, cx: slot * i + slot / 2, segs }
  })
})
const used = STACK_ORDER
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-muted text-xs">{{ t('home.bySession.caption') }}</span>
    <p v-if="!stacks.hasBreakdown" class="text-muted m-0 text-sm">
      {{ t('home.bySession.noBreakdown') }}
    </p>
    <template v-else>
      <svg
        class="block h-auto w-full"
        :viewBox="`0 0 ${W} ${H}`"
        role="img"
        :aria-label="t('home.bySession.alt')"
      >
        <g v-for="b in bars" :key="b.gp.id" aria-hidden="true">
          <rect
            v-for="sg in b.segs"
            :key="sg.key"
            :x="b.x"
            :y="sg.y"
            :width="b.w"
            :height="sg.h"
            rx="2"
            :class="FILL[sg.key]"
          />
          <text :x="b.cx" :y="H - 3" text-anchor="middle" font-size="11" class="fill-axis-txt">
            {{ b.gp.code }}
          </text>
        </g>
      </svg>
      <ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs">
        <li v-for="k in used" :key="k" class="text-body inline-flex items-center gap-1.5">
          <span class="inline-block size-3 rounded-sm" :class="SWATCH[k]" aria-hidden="true" />
          {{ t(`home.bySession.keys.${k}`) }}
        </li>
      </ul>
      <details class="text-sm">
        <summary class="text-link min-h-11 cursor-pointer py-2 md:min-h-8 md:py-1">
          {{ t('home.chart.view.table') }}
        </summary>
        <div
          class="overflow-x-auto"
          role="region"
          :aria-label="t('home.bySession.tableCaption')"
          tabindex="0"
        >
          <table class="w-full border-collapse tabular-nums">
            <caption class="sr-only">
              {{
                t('home.bySession.tableCaption')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col" class="text-muted p-2 text-left text-xs">
                  {{ t('home.bySession.gp') }}
                </th>
                <th
                  v-for="k in used"
                  :key="k"
                  scope="col"
                  class="text-muted p-2 text-right text-xs"
                >
                  {{ t(`home.bySession.keys.${k}`) }}
                </th>
                <th scope="col" class="text-muted p-2 text-right text-xs">
                  {{ t('home.bySession.total') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in stacks.bars" :key="b.gp.id" class="border-border border-t">
                <th scope="row" class="text-heading p-2 text-left font-semibold">
                  {{ b.gp.code }}
                </th>
                <td v-for="k in used" :key="k" class="p-2 text-right">
                  {{ formatNumber(b.segments.find((s) => s.key === k)?.value ?? 0, 1) }}
                </td>
                <td class="text-heading p-2 text-right font-semibold">
                  {{ formatNumber(b.total, 1) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </template>
  </div>
</template>
