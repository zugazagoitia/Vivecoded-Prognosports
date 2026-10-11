<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import { focusRing } from '@/components/ui/styles'
import { firstName } from '@/lib/ranking'
import {
  barHeight,
  compareRows,
  cumulativeDiffs,
  defaultRival,
  duels,
  finalLabel,
  signed,
  signedPlain,
  tiesText,
} from '@/lib/rankingStats'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R8 · Cara a cara (flag HEAD_TO_HEAD): tú contra un rival, GP a GP. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const me = computed(() => model.value.me)
const rivals = computed(() => model.value.players.filter((p) => !p.you))
const rivalId = ref<number | undefined>(defaultRival(model.value.players, me.value?.id))
const rival = computed(() => model.value.players.find((p) => p.id === rivalId.value))
const table = ref(false)

const mine = computed(() => me.value?.pts ?? [])
const theirs = computed(() => rival.value?.pts ?? [])
const diffs = computed(() => mine.value.map((v, i) => v - (theirs.value[i] ?? 0)))
const score = computed(() => duels(mine.value, theirs.value))
const cum = computed(() => cumulativeDiffs(mine.value, theirs.value))
const rname = computed(() => firstName(rival.value?.name ?? ''))
const final = computed(() => finalLabel(cum.value.at(-1) ?? 0, rname.value))
const rows = computed(() =>
  me.value && rival.value ? compareRows(me.value, rival.value, model.value.played.length) : [],
)

// Bars (800 x 300)
const n = computed(() => model.value.played.length)
const bw = computed(() => Math.min(26, (760 / Math.max(1, n.value)) * 0.7))
const bx = (i: number) => 20 + ((i + 0.5) * 760) / Math.max(1, n.value)
const mid = 150
const bh = (d: number) => Math.max(2, barHeight(d, diffs.value) * 110)
// Area (800 x 160)
const lo = computed(() => Math.min(0, ...cum.value))
const hi = computed(() => Math.max(0, ...cum.value))
const range = computed(() => Math.max(10, hi.value - lo.value))
const ay = (v: number) => 20 + ((hi.value - v) / range.value) * 100
const ax = (i: number) => 20 + (n.value > 1 ? (i * 700) / (n.value - 1) : 350)
const linePts = computed(() => cum.value.map((v, i) => `${ax(i)},${ay(v)}`).join(' '))
const areaPts = computed(
  () => `${ax(0)},${ay(0)} ${linePts.value} ${ax(cum.value.length - 1)},${ay(0)}`,
)
</script>

<template>
  <RankCard
    v-if="me && rival"
    :title="t('ranking.r8.title')"
    :subtitle="t('ranking.r8.subtitle')"
    flag
  >
    <template #controls>
      <PButton
        variant="outline"
        size="sm"
        :icon="table ? 'chart-line' : 'table'"
        :aria-pressed="table"
        @click="table = !table"
      >
        {{ table ? t('ranking.viewChart') : t('ranking.viewTable') }}
      </PButton>
    </template>

    <div role="group" :aria-label="t('ranking.r8.rival')" class="flex flex-wrap items-center gap-2">
      <span class="t-up text-muted mr-1">{{ t('ranking.r8.rival') }}</span>
      <button
        v-for="p in rivals"
        :key="p.id"
        type="button"
        :aria-pressed="p.id === rivalId"
        :class="[
          'border-border-input bg-surface text-body hover:bg-surface-muted aria-pressed:bg-tint aria-pressed:border-focus-ring aria-pressed:text-tint-fg inline-flex min-h-8 cursor-pointer items-center rounded-full border px-3 py-1 text-[13px] aria-pressed:font-semibold',
          focusRing,
        ]"
        @click="rivalId = p.id"
      >
        {{ p.name }}
      </button>
    </div>

    <div
      role="group"
      :aria-label="t('ranking.r8.scoreboard')"
      class="bg-surface-muted grid items-center gap-4 rounded-lg px-5 py-4 min-[1001px]:grid-cols-[minmax(0,1fr)_240px_minmax(0,1fr)]"
    >
      <div class="min-[1001px]:text-right">
        <span class="text-muted block text-sm">{{
          t('ranking.r8.standing', { pos: me.pos, pts: me.total })
        }}</span>
        <b class="text-heading border-series-you border-b-4 text-[22px]">{{ t('ranking.you') }}</b>
      </div>
      <div class="flex items-baseline justify-center gap-3">
        <b class="text-heading text-[44px] leading-[48px] tabular-nums" data-score="mine">{{
          score.mine
        }}</b>
        <span class="text-muted text-sm">{{ tiesText(score.ties) }}</span>
        <b class="text-heading text-[44px] leading-[48px] tabular-nums" data-score="theirs">{{
          score.theirs
        }}</b>
      </div>
      <div>
        <span class="text-muted block text-sm">{{
          t('ranking.r8.standing', { pos: rival.pos, pts: rival.total })
        }}</span>
        <b class="text-heading border-series-2 border-b-4 text-[22px]">{{ rname }}</b>
      </div>
    </div>

    <div v-if="!table" class="grid items-start gap-7 min-[1001px]:grid-cols-[minmax(0,1fr)_340px]">
      <div class="flex min-w-0 flex-col gap-2">
        <b class="text-heading text-sm">{{ t('ranking.r8.barsTitle') }}</b>
        <div class="tw">
          <svg
            viewBox="0 0 800 300"
            class="block h-auto w-full min-w-[560px]"
            role="img"
            :aria-label="t('ranking.r8.barsAria', { name: rname })"
          >
            <g aria-hidden="true">
              <text x="20" y="14" class="fill-series-you text-[11px] font-bold">
                {{ t('ranking.r8.youWin') }}
              </text>
              <text x="20" y="294" class="fill-series-2 text-[11px] font-bold">
                {{ t('ranking.r8.theyWin', { name: rname.toUpperCase() }) }}
              </text>
              <line x1="20" x2="780" :y1="mid" :y2="mid" class="stroke-axis" />
              <g v-for="(d, i) in diffs" :key="i">
                <rect
                  :x="bx(i) - bw / 2"
                  :y="d >= 0 ? mid - bh(d) : mid"
                  :width="bw"
                  :height="bh(d)"
                  rx="3"
                  :class="d >= 0 ? 'fill-series-you' : 'fill-series-2'"
                />
                <text
                  :x="bx(i)"
                  :y="d >= 0 ? mid - bh(d) - 4 : mid + bh(d) + 12"
                  text-anchor="middle"
                  class="fill-heading text-[10px]"
                >
                  {{ signed(d) }}
                </text>
                <text
                  :x="bx(i)"
                  :y="mid + (d < 0 ? bh(d) + 26 : 14)"
                  text-anchor="middle"
                  class="fill-axis-txt text-[10px]"
                >
                  {{ model.played[i]?.code }}
                </text>
              </g>
            </g>
          </svg>
        </div>
        <b class="text-heading mt-2 text-sm">{{ t('ranking.r8.cumTitle') }}</b>
        <div class="tw">
          <svg
            viewBox="0 0 800 160"
            class="block h-auto w-full min-w-[560px]"
            role="img"
            :aria-label="t('ranking.r8.cumAria', { label: final })"
          >
            <g aria-hidden="true">
              <line
                x1="20"
                x2="780"
                :y1="ay(0)"
                :y2="ay(0)"
                class="stroke-axis"
                stroke-dasharray="4 4"
              />
              <text x="780" :y="ay(0) - 4" text-anchor="end" class="fill-axis-txt text-[10px]">
                {{ t('ranking.r8.tie') }}
              </text>
              <polygon :points="areaPts" class="fill-tint" />
              <polyline
                :points="linePts"
                fill="none"
                class="stroke-series-you"
                stroke-width="2.5"
                stroke-linejoin="round"
              />
              <text
                :x="ax(cum.length - 1) + 40"
                :y="(cum.at(-1) ?? 0) >= 0 ? ay(cum.at(-1) ?? 0) - 8 : ay(cum.at(-1) ?? 0) + 16"
                text-anchor="end"
                class="fill-heading text-[11px] font-semibold"
              >
                {{ final }}
              </text>
            </g>
          </svg>
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <b class="text-heading text-sm">{{ t('ranking.r8.compare') }}</b>
        <div v-for="r in rows" :key="r.label" class="flex flex-col gap-1">
          <span class="text-muted text-center text-xs">{{ r.label }}</span>
          <div
            class="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-1 tabular-nums"
          >
            <span class="text-right text-sm" :class="r.boldA ? 'font-bold' : ''">{{ r.a }}</span>
            <span class="flex h-2.5 justify-end"
              ><span class="bg-series-you h-full rounded-l-[3px]" :style="{ width: `${r.wa}%` }"
            /></span>
            <span class="flex h-2.5"
              ><span class="bg-series-2 h-full rounded-r-[3px]" :style="{ width: `${r.wb}%` }"
            /></span>
            <span class="text-sm" :class="r.boldB ? 'font-bold' : ''">{{ r.b }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="tw">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('ranking.r8.title')
          }}
        </caption>
        <thead>
          <tr class="bg-surface-muted text-muted text-xs uppercase">
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.gp') }}</th>
            <th scope="col" class="px-3 py-2.5 text-right">{{ t('ranking.you') }}</th>
            <th scope="col" class="px-3 py-2.5 text-right">{{ rname }}</th>
            <th scope="col" class="px-3 py-2.5 text-right">{{ t('ranking.r8.diff') }}</th>
            <th scope="col" class="px-3 py-2.5 text-right">{{ t('ranking.r8.acc') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(g, i) in model.played" :key="g.id" class="border-border border-t">
            <th scope="row" class="px-3 py-2 text-left font-medium">{{ g.name }}</th>
            <td class="px-3 py-2 text-right">{{ mine[i] }}</td>
            <td class="px-3 py-2 text-right">{{ theirs[i] }}</td>
            <td class="text-heading px-3 py-2 text-right font-bold">{{ signed(diffs[i] ?? 0) }}</td>
            <td class="px-3 py-2 text-right">{{ signedPlain(cum[i] ?? 0) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </RankCard>
  <RankCard v-else :title="t('ranking.r8.title')" flag>
    <EmptyState
      icon="groups"
      :title="t('ranking.r8.noRivals')"
      :text="t('ranking.r8.noRivalsText')"
    />
  </RankCard>
</template>
