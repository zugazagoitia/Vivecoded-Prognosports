<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { compactMovement, formatDec, minus, movementLabel, type RankPlayer } from '@/lib/ranking'
import {
  dotIfZero,
  formCell,
  gapPrev,
  gapText,
  gpAverage,
  lastForm,
  nearFilter,
  seasonMax,
  sortStandings,
  sparkPoints,
  type SortKey,
} from '@/lib/rankingTable'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'
import R1Mobile from './R1Mobile.vue'

/** R1 · Clasificación general (escritorio) y su variante móvil (R1m). */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const mobile = useMediaQuery(MOBILE_QUERY)

const model = computed(() => props.rk.model.value!)
const me = computed(() => model.value.me)
const players = computed(() => model.value.players)
const n = computed(() => model.value.played.length)

type Col = { key: SortKey | 'gap' | 'prev' | 'gps'; label: string; title: string }
const cols = computed<Col[]>(() =>
  (['total', 'gap', 'prev', 'avg', 'wins', 'podiums', 'hits', 'gps'] as const).map((key) => ({
    key,
    label: t(`ranking.r1.cols.${key}`),
    title: t(`ranking.r1.titles.${key}`),
  })),
)

const sort = ref<SortKey>('total')
const near = ref(false)
const open = ref<number | null>(me.value?.id ?? null)

function pick(key: Col['key']) {
  sort.value = (['avg', 'wins', 'podiums', 'hits', 'total'] as string[]).includes(key)
    ? (key as SortKey)
    : 'total'
}
const rows = computed(() => {
  const base = near.value && me.value ? nearFilter(players.value, me.value.pos) : players.value
  return sortStandings(base, sort.value)
})

const dotClass = (p: RankPlayer) => {
  if (p.you) return 'bg-series-you'
  const tones = ['bg-series-2', 'bg-series-3', 'bg-series-4', 'bg-series-5', 'bg-series-6']
  const i = players.value
    .filter((x) => !x.you)
    .slice(0, 5)
    .indexOf(p)
  return i >= 0 ? tones[i] : 'bg-series-rest'
}
const profile = (p: RankPlayer) => (p.you ? '/u' : `/u/${p.id}`)
const label = (p: RankPlayer) => (p.you ? `${p.name} (${t('ranking.you').toLowerCase()})` : p.name)
const toggle = (id: number) => (open.value = open.value === id ? null : id)
const prevText = (p: RankPlayer) => gapText(gapPrev(players.value, p.id))
const leaderGap = (p: RankPlayer) =>
  p.pos === 1 ? '—' : minus((players.value[0]?.total ?? 0) - p.total)
const form = (p: RankPlayer) => lastForm(p)
const formTitle = (g: number, place: number) =>
  `${model.value.played[g]?.name ?? ''}: ${place}.º ${t('ranking.r1.ofGp')}`

// Expanded bar chart (1000 x 140)
const W = 1000
const H = 140
const max = computed(() => seasonMax(model.value))
const barX = (i: number) => 20 + ((i + 0.5) * (W - 40)) / Math.max(1, n.value)
const barW = computed(() => Math.min(36, ((W - 40) / Math.max(1, n.value)) * 0.7))
const barY = (v: number) => 20 + (1 - v / max.value) * (H - 50)
</script>

<template>
  <R1Mobile v-if="mobile" :rk="rk" />
  <RankCard
    v-else
    :title="t('ranking.r1.title')"
    :subtitle="t('ranking.r1.subtitle')"
    :padded="false"
  >
    <template #controls>
      <PCheckbox v-model="near" :label="t('ranking.r1.near')" />
    </template>
    <div class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('ranking.r1.title')
          }}
        </caption>
        <thead>
          <tr class="bg-surface-muted text-muted text-xs uppercase">
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.cols.pos') }}</th>
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.cols.player') }}</th>
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.r1.cols.form') }}</th>
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.r1.cols.position') }}</th>
            <th
              v-for="c in cols"
              :key="c.key"
              scope="col"
              class="px-2 py-2.5 text-right"
              :aria-sort="sort === c.key ? 'descending' : 'none'"
            >
              <button
                type="button"
                :title="c.title"
                :class="[
                  'hover:text-heading inline-flex min-h-8 cursor-pointer items-center gap-1 rounded px-1 uppercase',
                  sort === c.key ? 'text-tint-fg' : '',
                  focusRing,
                ]"
                @click="pick(c.key)"
              >
                {{ c.label }}
                <PIcon v-if="sort === c.key" name="arrow-down" :size="16" />
              </button>
            </th>
            <th scope="col" class="px-2 py-2.5">
              <span class="sr-only">{{ t('ranking.r1.detail') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="p in rows" :key="p.id">
            <tr
              class="border-border hover:bg-surface-hover border-t"
              :class="{ 'bg-tint': p.you || open === p.id }"
              :data-me="p.you || undefined"
            >
              <td class="px-3 py-2 whitespace-nowrap">
                <b class="text-heading">{{ p.pos }}</b>
                <span
                  class="ml-1 text-xs font-bold"
                  :class="p.move > 0 ? 'text-ok-fg' : p.move < 0 ? 'text-err-fg' : 'text-muted'"
                >
                  <span aria-hidden="true">{{ compactMovement(p.move, '—') }}</span>
                  <span class="sr-only">{{ movementLabel(p.move) }}</span>
                </span>
              </td>
              <td class="px-3 py-2">
                <button
                  type="button"
                  :class="['inline-flex cursor-pointer items-center gap-2 font-medium', focusRing]"
                  @click="toggle(p.id)"
                >
                  <span class="size-2 rounded-full" :class="dotClass(p)" aria-hidden="true" />
                  <Avatar :name="p.name" :size="24" :you="p.you" />
                  {{ label(p) }}
                </button>
              </td>
              <td class="px-3 py-2">
                <span class="inline-flex gap-1">
                  <span
                    v-for="f in form(p)"
                    :key="f.g"
                    role="img"
                    :title="formTitle(f.g, f.place)"
                    :aria-label="formTitle(f.g, f.place)"
                    class="inline-flex h-[22px] w-6 items-center justify-center rounded text-xs font-bold"
                    :class="
                      formCell(f.place) === 'w'
                        ? 'bg-primary text-on-primary'
                        : formCell(f.place) === 'p'
                          ? 'bg-tint text-tint-fg'
                          : 'bg-surface-muted text-muted'
                    "
                    >{{ f.place }}</span
                  >
                </span>
              </td>
              <td class="px-3 py-2">
                <svg
                  width="100"
                  height="28"
                  viewBox="0 0 100 28"
                  aria-hidden="true"
                  :class="p.you ? 'text-series-you' : 'text-muted'"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                    :points="
                      sparkPoints(p.places, players.length)
                        .map((q) => q.join(','))
                        .join(' ')
                    "
                  />
                  <circle
                    v-if="p.places.length"
                    r="2.5"
                    fill="currentColor"
                    :cx="sparkPoints(p.places, players.length).at(-1)![0]"
                    :cy="sparkPoints(p.places, players.length).at(-1)![1]"
                  />
                </svg>
              </td>
              <td class="text-heading px-2 py-2 text-right font-bold">{{ p.total }}</td>
              <td class="text-muted px-2 py-2 text-right">{{ leaderGap(p) }}</td>
              <td class="text-muted px-2 py-2 text-right">{{ prevText(p) }}</td>
              <td class="px-2 py-2 text-right">{{ formatDec(p.avg) }}</td>
              <td class="px-2 py-2 text-right">{{ dotIfZero(p.wins) }}</td>
              <td class="px-2 py-2 text-right">{{ dotIfZero(p.podiums) }}</td>
              <td class="px-2 py-2 text-right">{{ p.hitsTotal }}</td>
              <td class="px-2 py-2 text-right">{{ p.participated }}/{{ n }}</td>
              <td class="px-2 py-2 text-right">
                <button
                  type="button"
                  :aria-expanded="open === p.id"
                  :aria-label="
                    open === p.id
                      ? t('ranking.r1.hide', { name: p.name })
                      : t('ranking.r1.show', { name: p.name })
                  "
                  :class="[
                    'inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-md',
                    focusRing,
                  ]"
                  @click="toggle(p.id)"
                >
                  <PIcon
                    name="chevron-down"
                    :size="16"
                    :class="open === p.id ? 'rotate-180' : ''"
                  />
                </button>
              </td>
            </tr>
            <tr v-if="open === p.id" class="bg-surface-muted" data-expanded>
              <td colspan="13" class="px-5 py-4">
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <b class="text-heading text-sm">
                    {{ t('ranking.r1.expTitle', { name: p.name }) }}
                    <span class="text-muted font-normal">{{ t('ranking.r1.expNote') }}</span>
                  </b>
                  <RouterLink
                    :to="profile(p)"
                    :class="['text-link text-sm font-medium', focusRing]"
                    >{{ t('ranking.r1.seeProfile') }}</RouterLink
                  >
                </div>
                <svg
                  :viewBox="`0 0 ${W} ${H}`"
                  class="block h-auto w-full"
                  role="img"
                  :aria-label="t('ranking.r1.expAria', { name: p.name })"
                >
                  <g v-for="(g, i) in model.played" :key="g.id">
                    <rect
                      :x="barX(i) - barW / 2"
                      :y="barY(p.pts[i] ?? 0)"
                      :width="barW"
                      :height="H - 30 - barY(p.pts[i] ?? 0)"
                      rx="3"
                      :class="
                        p.gpPlaces[i] === 1 && (p.pts[i] ?? 0) > 0
                          ? 'fill-brand-800'
                          : 'fill-brand-300'
                      "
                    />
                    <text
                      :x="barX(i)"
                      :y="barY(p.pts[i] ?? 0) - 4"
                      text-anchor="middle"
                      class="fill-heading text-[11px] font-semibold"
                    >
                      {{ p.pts[i] }}
                    </text>
                    <text
                      :x="barX(i)"
                      :y="H - 12"
                      text-anchor="middle"
                      class="fill-axis-txt text-[10px]"
                    >
                      {{ g.code }}
                    </text>
                    <line
                      :x1="barX(i) - barW / 2 - 3"
                      :x2="barX(i) + barW / 2 + 3"
                      :y1="barY(gpAverage(model, i))"
                      :y2="barY(gpAverage(model, i))"
                      class="stroke-heading"
                      stroke-width="2"
                    />
                  </g>
                </svg>
                <div class="sr-only">
                  <table>
                    <caption>
                      {{
                        t('ranking.r1.expAria', { name: p.name })
                      }}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">{{ t('ranking.gp') }}</th>
                        <th scope="col">{{ t('ranking.cols.points') }}</th>
                        <th scope="col">{{ t('ranking.r1.communityAvg') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(g, i) in model.played" :key="g.id">
                        <th scope="row">{{ g.name }}</th>
                        <td>{{ p.pts[i] }}</td>
                        <td>{{ formatDec(gpAverage(model, i)) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <template #footer>
      <ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        <li v-for="k in ['form', 'position', 'prev', 'avg']" :key="k">
          {{ t(`ranking.r1.legend.${k}`) }}
        </li>
      </ul>
    </template>
  </RankCard>
</template>
