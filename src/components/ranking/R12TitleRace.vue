<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { placeLabels, type Tone } from '@/components/charts/model'
import { EmptyState } from '@/components/states'
import PTag from '@/components/ui/PTag.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { firstName, minus } from '@/lib/ranking'
import {
  alive,
  difficulty,
  maxRemaining,
  needPerGp,
  pendingGps,
  projection,
  raceState,
  yMax200,
} from '@/lib/rankingEvolution'
import { topFiveAndMe } from '@/lib/rankingTable'
import { useCommunityRuleset } from '@/queries/community'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R12 · Lucha por el título (flag TITLE_RACE): en juego, proyección y lo que necesitas. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const ruleset = useCommunityRuleset(() => props.rk.args.value)
const rules = computed(() => ruleset.data.value?.data ?? undefined)

const view = ref<'range' | 'proj' | 'need'>('range')
const views = computed(() =>
  (['range', 'proj', 'need'] as const).map((v) => ({
    value: v,
    label: t(`ranking.r12.views.${v}`),
  })),
)
const players = computed(() => model.value.players)
const n = computed(() => model.value.played.length)
const pending = computed(() => pendingGps(model.value))
const remaining = computed(() => maxRemaining(pending.value, rules.value))
const lead = computed(() => players.value[0]?.total ?? 0)
const living = computed(() =>
  alive(
    players.value.map((p) => p.total),
    remaining.value,
  ),
)
const scaleMax = computed(() => Math.max(1, lead.value + remaining.value))
const canWin = (total: number) => total + remaining.value >= lead.value
const state = (i: number, total: number) => raceState(i, canWin(total))
const stateTag = { leader: 'brand', alive: 'ok', out: 'gray' } as const
const pc = (v: number) => `${((v / scaleMax.value) * 100).toFixed(2)}%`

// Projection
const tones: Tone[] = ['s2', 's3', 's4', 's5', 's6']
const shown = computed(() => {
  let k = 0
  return topFiveAndMe(model.value).map((p) => {
    const proj = projection(p.pts, p.total, pending.value.length)
    return { p, tone: (p.you ? 'you' : tones[k++]) as Tone, proj }
  })
})
const yMax = computed(() => yMax200(Math.max(0, ...shown.value.map((s) => s.proj.high))))
const calendar = computed(() => model.value.calendar)
const W = 1000
const H = 420
const PL = 56
const PR = 170
const PT = 20
const PB = 30
const plotW = W - PL - PR
const x = (i: number) => PL + (i * plotW) / Math.max(1, calendar.value.length - 1)
const y = (v: number) => PT + (1 - v / yMax.value) * (H - PT - PB)
const lastX = computed(() => x(Math.max(0, n.value - 1)))
const labelsY = computed(() =>
  placeLabels(
    shown.value.map((s) => y(s.proj.final) + 4),
    15,
    PT + 8,
    H - PB,
  ),
)
const grid = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax.value)))
const pathOf = (acc: number[]) => acc.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')

// Needs
const chasers = computed(() => players.value.slice(1, 11))
const needs = computed(() =>
  chasers.value
    .map((p) => {
      const need = needPerGp(lead.value, p.total, n.value, pending.value.length)
      return need === undefined
        ? undefined
        : { p, need, diff: lead.value - p.total, level: difficulty(need, p.avg) }
    })
    .filter((r): r is NonNullable<typeof r> => r !== undefined),
)
const levelTag = { impossible: 'err', veryHard: 'warn', hard: 'warn', possible: 'ok' } as const
const cap = 70
const title = computed(() => view.value)
</script>

<template>
  <RankCard :title="t(`ranking.r12.${title}.title`)" :subtitle="t(`ranking.r12.${title}.sub`)" flag>
    <template #controls>
      <SegmentedControl v-model="view" :options="views" :label="t('ranking.r12.view')" />
    </template>

    <div class="flex flex-wrap gap-2">
      <PTag color="brand">{{ t('ranking.r12.left', { n: pending.length }) }}</PTag>
      <PTag>{{ t('ranking.r12.maxInPlay', { n: remaining }) }}</PTag>
      <PTag>{{ t('ranking.r12.alive', { n: living }, living) }}</PTag>
    </div>
    <p v-if="!rules && !ruleset.isLoading.value" class="text-muted text-xs">
      {{ t('ranking.r12.noRules') }}
    </p>

    <ol v-if="view === 'range'" class="m-0 flex list-none flex-col gap-1 p-0">
      <li
        v-for="(p, i) in players"
        :key="p.id"
        class="grid min-h-[34px] grid-cols-[28px_110px_minmax(0,1fr)_100px] items-center gap-2.5 min-[641px]:grid-cols-[30px_160px_minmax(0,1fr)_120px]"
        :class="[state(i, p.total) === 'out' ? 'text-muted' : '']"
        :data-state="state(i, p.total)"
      >
        <b class="text-heading text-right tabular-nums">{{ p.pos }}</b>
        <span class="truncate text-sm" :class="p.you ? 'font-bold' : 'font-medium'"
          >{{ p.name }}{{ p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}</span
        >
        <span class="relative flex h-[18px] items-center">
          <span
            class="h-full rounded-l-[3px]"
            :class="p.you ? 'bg-series-you' : 'bg-brand-300'"
            :style="{ width: pc(p.total) }"
          />
          <span
            class="ml-0.5 h-full"
            :class="p.you ? 'bg-brand-200' : 'bg-tint'"
            :style="{ width: pc(remaining) }"
          />
          <span class="text-muted ml-2 text-[11px] whitespace-nowrap tabular-nums">{{
            t('ranking.r12.max', { n: p.total + remaining })
          }}</span>
          <span
            class="border-gold absolute -top-1.5 -bottom-1.5 border-l-2 border-dashed"
            :style="{ left: pc(lead) }"
            aria-hidden="true"
          />
        </span>
        <PTag :color="stateTag[state(i, p.total)]">{{
          t(`ranking.r12.state.${state(i, p.total)}`)
        }}</PTag>
      </li>
      <li class="text-muted mt-2 flex list-none flex-wrap gap-x-4 text-xs">
        <span
          ><span
            class="bg-series-you mr-1.5 inline-block size-3 rounded-sm align-middle"
            aria-hidden="true"
          />{{ t('ranking.r12.legend.current') }}</span
        >
        <span
          ><span
            class="bg-tint mr-1.5 inline-block size-3 rounded-sm align-middle"
            aria-hidden="true"
          />{{ t('ranking.r12.legend.inPlay') }}</span
        >
        <span
          ><span
            class="border-gold mr-1.5 inline-block w-3 border-t-2 border-dashed align-middle"
            aria-hidden="true"
          />{{ t('ranking.r12.legend.leader', { n: lead }) }}</span
        >
      </li>
    </ol>

    <div v-else-if="view === 'proj'" class="flex flex-col gap-2">
      <div
        v-if="n && pending.length"
        class="tw"
        tabindex="0"
        role="region"
        :aria-label="t('ranking.scroll')"
      >
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          class="block h-auto w-full min-w-[640px]"
          role="img"
          :aria-label="t('ranking.r12.projAria')"
        >
          <g aria-hidden="true">
            <rect
              :x="lastX"
              :y="PT"
              :width="W - PR - lastX"
              :height="H - PT - PB"
              class="fill-surface-muted"
            />
            <text
              :x="(lastX + W - PR) / 2"
              :y="PT + 14"
              text-anchor="middle"
              class="fill-muted text-[11px] font-semibold"
              letter-spacing="0.05em"
            >
              {{ t('ranking.r12.projection') }}
            </text>
            <g v-for="v in grid" :key="v">
              <line :x1="PL" :x2="W - PR" :y1="y(v)" :y2="y(v)" class="stroke-grid" />
              <text :x="PL - 8" :y="y(v) + 4" text-anchor="end" class="fill-axis-txt text-[11px]">
                {{ v }}
              </text>
            </g>
            <text
              v-for="(g, i) in calendar"
              :key="g.id"
              :x="x(i)"
              :y="H - 10"
              text-anchor="middle"
              class="text-[10px]"
              :class="i < n ? 'fill-axis-txt' : 'fill-border-input'"
            >
              {{ g.code }}
            </text>
            <g v-for="(s, k) in shown" :key="s.p.id" :class="`rk-tone-${s.tone}`">
              <polygon
                :points="`${lastX},${y(s.p.total)} ${x(calendar.length - 1)},${y(s.proj.low)} ${x(calendar.length - 1)},${y(s.proj.high)}`"
                fill="currentColor"
                opacity="0.12"
              />
              <path
                :d="pathOf(s.p.acc)"
                fill="none"
                stroke="currentColor"
                :stroke-width="s.p.you ? 3 : 2"
                stroke-linejoin="round"
              />
              <line
                :x1="lastX"
                :x2="x(calendar.length - 1)"
                :y1="y(s.p.total)"
                :y2="y(s.proj.final)"
                stroke="currentColor"
                :stroke-width="s.p.you ? 3 : 2"
                stroke-dasharray="6 5"
              />
              <text
                :x="x(calendar.length - 1) + 8"
                :y="labelsY[k]"
                class="fill-heading text-xs font-semibold"
              >
                {{ s.p.you ? t('ranking.you') : firstName(s.p.name) }}
                <tspan class="fill-muted font-medium">
                  {{ t('ranking.r12.approx', { n: s.proj.final }) }}
                </tspan>
              </text>
            </g>
          </g>
        </svg>
      </div>
      <EmptyState
        v-else
        icon="schedule"
        :title="t('ranking.r12.noProjTitle')"
        :text="t('ranking.r12.noProjText')"
      />
      <p class="text-muted text-xs">{{ t('ranking.r12.projNote') }}</p>
      <div class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
        <table class="w-full border-collapse text-sm tabular-nums">
          <caption class="sr-only">
            {{
              t('ranking.r12.projTable')
            }}
          </caption>
          <thead>
            <tr class="bg-surface-muted text-muted text-xs uppercase">
              <th scope="col" class="px-3 py-2 text-left">{{ t('ranking.cols.player') }}</th>
              <th scope="col" class="px-3 py-2 text-right">{{ t('ranking.r12.cols.current') }}</th>
              <th scope="col" class="px-3 py-2 text-right">{{ t('ranking.r12.cols.pace') }}</th>
              <th scope="col" class="px-3 py-2 text-right">{{ t('ranking.r12.cols.final') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in shown"
              :key="s.p.id"
              class="border-border border-t"
              :class="{ 'bg-tint': s.p.you }"
            >
              <th scope="row" class="px-3 py-2 text-left font-medium">{{ s.p.name }}</th>
              <td class="px-3 py-2 text-right">{{ s.p.total }}</td>
              <td class="px-3 py-2 text-right">{{ s.proj.pace.toFixed(1).replace('.', ',') }}</td>
              <td class="text-heading px-3 py-2 text-right font-bold">{{ s.proj.final }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="flex flex-col gap-2">
      <EmptyState
        v-if="!needs.length"
        icon="schedule"
        :title="t('ranking.r12.noNeedTitle')"
        :text="t('ranking.r12.noNeedText')"
      />
      <div v-else class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
        <table class="w-full min-w-[640px] border-collapse text-sm tabular-nums">
          <caption class="sr-only">
            {{
              t('ranking.r12.need.title')
            }}
          </caption>
          <thead>
            <tr class="text-muted text-xs uppercase">
              <th scope="col" class="px-2 py-2 text-left">{{ t('ranking.cols.player') }}</th>
              <th scope="col" class="px-2 py-2 text-right">{{ t('ranking.cols.gapLeader') }}</th>
              <th scope="col" class="px-2 py-2 text-right">{{ t('ranking.r12.cols.need') }}</th>
              <th scope="col" class="px-2 py-2 text-left">{{ t('ranking.r12.cols.vsAvg') }}</th>
              <th scope="col" class="px-2 py-2 text-left">
                {{ t('ranking.r12.cols.difficulty') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in needs"
              :key="r.p.id"
              class="border-border border-t"
              :class="{ 'bg-tint': r.p.you }"
            >
              <th
                scope="row"
                class="px-2 py-2 text-left"
                :class="r.p.you ? 'font-bold' : 'font-medium'"
              >
                {{ r.p.name }}{{ r.p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}
              </th>
              <td class="text-muted px-2 py-2 text-right">{{ minus(r.diff) }}</td>
              <td class="text-heading px-2 py-2 text-right text-base font-bold">
                {{ Math.round(r.need) }}
              </td>
              <td class="px-2 py-2">
                <span
                  class="bg-surface-muted relative block h-[22px] rounded"
                  role="img"
                  :aria-label="
                    t('ranking.r12.barAria', {
                      avg: r.p.avg.toFixed(1).replace('.', ','),
                      need: Math.round(r.need),
                    })
                  "
                >
                  <span
                    class="bg-brand-300 absolute top-1/2 left-0 h-2.5 -translate-y-1/2 rounded"
                    :style="{ width: `${Math.min(100, (r.p.avg / cap) * 100)}%` }"
                  />
                  <span
                    class="absolute inset-y-0 w-[3px]"
                    :class="r.level === 'impossible' ? 'bg-err' : 'bg-heading'"
                    :style="{ left: `${Math.min(100, (r.need / cap) * 100)}%` }"
                  />
                </span>
              </td>
              <td class="px-2 py-2">
                <PTag :color="levelTag[r.level]">{{ t(`ranking.r12.level.${r.level}`) }}</PTag>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-muted text-xs">{{ t('ranking.r12.needNote') }}</p>
    </div>
  </RankCard>
</template>
