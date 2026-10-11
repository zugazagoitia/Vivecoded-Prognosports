<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import {
  altRanking,
  communityMean,
  moveText,
  PART_LABEL,
  PARTS_R13,
  shareOf,
  stackGp,
  sumByKind,
  seasonByKind,
  type Part,
  type SessionKind,
} from '@/lib/rankingStats'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R13 · Puntos por sesión (flag POINTS_BY_SESSION): tu temporada, reparto y rankings alternativos. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const me = computed(() => model.value.me)
const view = ref<'me' | 'share' | 'alt'>('me')
const views = computed(() =>
  (['me', 'share', 'alt'] as const).map((v) => ({ value: v, label: t(`ranking.r13.views.${v}`) })),
)
const BG: Record<Part, string> = {
  q: 'bg-series-2',
  cs: 'bg-series-6',
  sp: 'bg-series-3',
  r: 'bg-series-4',
  bonus: 'bg-series-5',
}

// Your season
const stacks = computed(() =>
  model.value.played.map((gp, g) => ({
    gp,
    total: me.value?.pts[g] ?? 0,
    parts: stackGp(sumByKind(me.value?.bySession[g] ?? {}, gp), me.value?.bonus[g] ?? 0),
  })),
)
const mean = computed(() => {
  const totals = model.value.players.map((p) => p.total)
  return communityMean(totals, totals.length, model.value.played.length)
})
const W = 1000
const H = 360
const PL = 44
const PB = 44
const PT = 24
const yMax = computed(() => {
  const top = Math.max(...stacks.value.map((s) => s.total), mean.value, 1)
  return Math.ceil(top / 20) * 20
})
const y = (v: number) => PT + (1 - v / yMax.value) * (H - PT - PB)
const step = computed(() => (W - PL - 10) / Math.max(1, stacks.value.length))
const bx = (i: number) => PL + step.value * (i + 0.5)
const bw = computed(() => Math.min(40, step.value * 0.7))
const grid = computed(() => Array.from({ length: 4 }, (_, i) => Math.round((yMax.value / 3) * i)))
const segs = (s: (typeof stacks.value)[number]) => {
  let acc = 0
  return s.parts.map((p) => {
    const y0 = y(acc)
    acc += p.value
    return { ...p, y: y(acc), h: Math.max(0, y0 - y(acc) - 1) }
  })
}

// Share
const shares = computed(() =>
  model.value.players.map((p) => {
    const by = seasonByKind(p, model.value, 'bySession')
    const parts = { ...by, bonus: p.bonus.reduce((a, b) => a + b, 0) } as Record<Part, number>
    return { p, by, parts, shares: shareOf(parts), total: p.total }
  }),
)
// Alternatives
const alt = computed(() => {
  const rows = shares.value.map((s) => ({
    id: s.p.id,
    name: s.p.name,
    you: s.p.you,
    kinds: s.by,
    pos: s.p.pos,
  }))
  const cards: {
    key: string
    tone: string
    rows: { id: number; name: string; you: boolean; place: number; points: number; move: number }[]
  }[] = (['q', 'sp', 'r'] as SessionKind[]).map((k) => ({
    key: k,
    tone: BG[k],
    rows: altRanking(rows, k),
  }))
  cards.push({
    key: 'real',
    tone: 'bg-series-you',
    rows: model.value.players
      .slice(0, 8)
      .map((p) => ({ id: p.id, name: p.name, you: p.you, place: p.pos, points: p.total, move: 0 })),
  })
  return cards
})
const shareLabel = (list: { part: Part; value: number }[]) =>
  list.map((x) => PART_LABEL[x.part] + ' ' + x.value).join(', ')
const title = computed(() => view.value)
const cardTitle: Record<string, string> = { q: 'q', sp: 'sp', r: 'r', real: 'real' }
</script>

<template>
  <RankCard
    v-if="model.played.length"
    :title="t(`ranking.r13.${title}.title`)"
    :subtitle="t(`ranking.r13.${title}.sub`)"
    flag
  >
    <template #controls>
      <SegmentedControl v-model="view" :options="views" :label="t('ranking.r13.view')" />
    </template>

    <ul
      class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs"
      :aria-label="t('ranking.r13.legend')"
    >
      <li v-for="p in PARTS_R13" :key="p" class="inline-flex items-center gap-1.5">
        <span class="inline-block size-3 rounded-sm" :class="BG[p]" aria-hidden="true" />{{
          PART_LABEL[p]
        }}
      </li>
    </ul>

    <template v-if="view === 'me' && me">
      <div class="tw">
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          class="block h-auto w-full min-w-[640px]"
          role="img"
          :aria-label="t('ranking.r13.me.aria')"
        >
          <g aria-hidden="true">
            <g v-for="v in grid" :key="v">
              <line :x1="PL" :x2="W - 10" :y1="y(v)" :y2="y(v)" class="stroke-grid" />
              <text :x="PL - 6" :y="y(v) + 4" text-anchor="end" class="fill-axis-txt text-[11px]">
                {{ v }}
              </text>
            </g>
            <g v-for="(s, i) in stacks" :key="s.gp.id">
              <rect
                v-for="g in segs(s)"
                :key="g.part"
                :x="bx(i) - bw / 2"
                :y="g.y"
                :width="bw"
                :height="g.h"
                :class="BG[g.part].replace('bg-', 'fill-')"
              >
                <title>{{ PART_LABEL[g.part] }}: {{ g.value }}</title>
              </rect>
              <text
                :x="bx(i)"
                :y="y(s.total) - 5"
                text-anchor="middle"
                class="fill-heading text-[11px] font-semibold"
              >
                {{ s.total }}
              </text>
              <text
                :x="bx(i)"
                :y="H - PB + 14"
                text-anchor="middle"
                class="fill-axis-txt text-[10px]"
              >
                {{ s.gp.code }}
              </text>
              <text
                v-if="s.gp.sprint"
                :x="bx(i)"
                :y="H - PB + 26"
                text-anchor="middle"
                class="fill-series-3 text-[9px] font-bold"
              >
                {{ t('ranking.r13.sprint') }}
              </text>
            </g>
            <line
              :x1="PL"
              :x2="W - 10"
              :y1="y(mean)"
              :y2="y(mean)"
              class="stroke-heading"
              stroke-width="2"
              stroke-dasharray="6 4"
            />
            <text :x="W - 12" :y="y(mean) - 6" text-anchor="end" class="fill-heading text-[11px]">
              {{ t('ranking.r13.mean', { n: Math.round(mean) }) }}
            </text>
          </g>
        </svg>
      </div>
      <table class="sr-only">
        <caption>
          {{
            t('ranking.r13.me.aria')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('ranking.gp') }}</th>
            <th v-for="p in PARTS_R13" :key="p" scope="col">{{ PART_LABEL[p] }}</th>
            <th scope="col">{{ t('ranking.total') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in stacks" :key="s.gp.id">
            <th scope="row">{{ s.gp.name }}</th>
            <td v-for="p in PARTS_R13" :key="p">
              {{ s.parts.find((x) => x.part === p)?.value ?? 0 }}
            </td>
            <td>{{ s.total }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <ul v-else-if="view === 'share'" class="m-0 flex list-none flex-col gap-1 p-0">
      <li
        v-for="s in shares"
        :key="s.p.id"
        class="grid min-h-8 grid-cols-[110px_minmax(0,1fr)_60px] items-center gap-3 rounded px-1.5 min-[641px]:grid-cols-[160px_minmax(0,1fr)_70px]"
        :class="{ 'bg-tint': s.p.you }"
        :data-me="s.p.you || undefined"
      >
        <span class="truncate text-sm" :class="s.p.you ? 'font-bold' : 'font-medium'"
          >{{ s.p.name }}{{ s.p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}</span
        >
        <span class="flex h-[22px] gap-0.5" role="img" :aria-label="shareLabel(s.shares)">
          <span
            v-for="x in s.shares.filter((x) => x.value > 0)"
            :key="x.part"
            class="rk-white flex items-center justify-center rounded-sm text-[11px] font-semibold"
            :class="BG[x.part]"
            :style="{ width: `${x.pct}%` }"
            :title="`${PART_LABEL[x.part]}: ${x.value} ${t('ranking.pts')}`"
            >{{ x.label }}</span
          >
        </span>
        <b class="text-heading text-right tabular-nums">{{ s.total }}</b>
      </li>
    </ul>

    <div v-else class="grid4 !gap-3">
      <section
        v-for="c in alt"
        :key="c.key"
        class="border-border overflow-hidden rounded-lg border"
        :aria-labelledby="`rk13-${c.key}`"
      >
        <h3
          :id="`rk13-${c.key}`"
          class="border-border flex items-center gap-2 border-b px-3.5 py-2.5 text-sm font-bold"
        >
          <span class="inline-block size-2.5 rounded-sm" :class="c.tone" aria-hidden="true" />{{
            t(`ranking.r13.alt.${cardTitle[c.key]}`)
          }}
        </h3>
        <ol class="m-0 list-none p-0">
          <li
            v-for="r in c.rows"
            :key="r.id"
            class="flex items-center gap-2 px-3.5 py-[7px] text-[13px]"
            :class="r.you ? 'bg-tint font-bold' : ''"
          >
            <span class="w-[18px] font-bold tabular-nums">{{ r.place }}</span>
            <span class="min-w-0 flex-1 truncate">{{ r.you ? t('ranking.you') : r.name }}</span>
            <span class="text-xs font-bold" :class="r.move > 0 ? 'text-ok-fg' : 'text-err-fg'">
              <span aria-hidden="true">{{ moveText(r.move) }}</span>
              <span v-if="r.move" class="sr-only">{{
                r.move > 0 ? t('ranking.up', { n: r.move }) : t('ranking.down', { n: -r.move })
              }}</span>
            </span>
            <span class="w-9 text-right tabular-nums">{{ r.points }}</span>
          </li>
        </ol>
      </section>
      <p class="text-muted col-span-full text-xs">{{ t('ranking.r13.alt.note') }}</p>
    </div>
  </RankCard>
</template>
