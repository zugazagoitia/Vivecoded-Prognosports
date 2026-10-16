<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { mean, type RankPlayer } from '@/lib/ranking'
import {
  attemptsOf,
  availableKinds,
  bestByKind,
  diffText,
  dotSize,
  KIND_LONG,
  KIND_SHORT,
  KINDS_R11,
  overallRate,
  rateOf,
  seasonByKind,
  type SessionKind,
} from '@/lib/rankingStats'
import { useCommunityRuleset } from '@/queries/community'
import type { Ranking } from '@/queries/ranking'
import RankCard from './RankCard.vue'

/** R11 · Aciertos por tipo de sesión (flag HITS_BY_TYPE). */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const ruleset = useCommunityRuleset(() => props.rk.args.value)
const rules = computed(() => ruleset.data.value?.data ?? undefined)

const view = ref<'count' | 'grid' | 'me'>('count')
const table = ref(false)
const views = computed(() =>
  (['count', 'grid', 'me'] as const).map((v) => ({ value: v, label: t(`ranking.r11.views.${v}`) })),
)
const avail = computed(() => availableKinds(model.value.players, model.value))
const triesOf = (p: RankPlayer) => {
  const all = attemptsOf(p, model.value.played, rules.value)
  return {
    cs: avail.value.cs ? all.cs : 0,
    sp: avail.value.sp ? all.sp : 0,
    q: avail.value.q ? all.q : 0,
    r: avail.value.r ? all.r : 0,
  }
}
const hasRules = computed(() => model.value.players.some((p) => sumTries(triesOf(p)) > 0))
const sumTries = (t: Record<SessionKind, number>) => t.cs + t.sp + t.q + t.r
const na = computed(() => t('ranking.r11.unavailable'))

// Colour by session type (same as R13).
const KIND_BG: Record<SessionKind, string> = {
  cs: 'bg-series-6',
  sp: 'bg-series-3',
  q: 'bg-series-2',
  r: 'bg-series-4',
}

const rows = computed(() =>
  model.value.players
    .map((p) => {
      const hits = seasonByKind(p, model.value, 'hitsBySession')
      const total = KINDS_R11.reduce((s, k) => s + hits[k], 0)
      const tries = triesOf(p)
      return {
        p,
        hits,
        tries,
        total,
        rate: overallRate(hits, tries),
        rates: KINDS_R11.map((k) => rateOf(hits[k], tries[k])),
      }
    })
    .sort((a, b) => b.total - a.total || a.p.pos - b.p.pos),
)
const first = computed(() => Math.max(1, rows.value[0]?.total ?? 1))
const best = computed(() =>
  KINDS_R11.map((_, i) =>
    bestByKind(
      rows.value.map((r) => r.rates[i]),
      rows.value.map((r) => r.p.id),
    ),
  ),
)
const mine = computed(() => rows.value.find((r) => r.p.you))
const avgRates = computed(() =>
  KINDS_R11.map((_, i) => {
    const v = rows.value.map((r) => r.rates[i]).filter((x): x is number => x != null)
    return v.length ? mean(v) * 100 : undefined
  }),
)
const hitsLabel = (h: Record<SessionKind, number>) =>
  KINDS_R11.map((k) => KIND_SHORT[k] + ' ' + (avail.value[k] ? h[k] : na.value)).join(', ')
const pct = (r: number | undefined, k: SessionKind) =>
  !avail.value[k] ? na.value : r == null ? '—' : `${Math.round(r * 100)} %`
const tip = (k: SessionKind, h: number, tries: Record<SessionKind, number>) =>
  avail.value[k] ? `${KIND_LONG[k]}: ${h} de ${tries[k]}` : `${KIND_LONG[k]}: ${na.value}`
const title = computed(() =>
  view.value === 'count' ? 'count' : view.value === 'grid' ? 'grid' : 'me',
)
const pos = (v: number) => `${Math.min(100, Math.max(0, v)).toFixed(1)}%`
</script>

<template>
  <RankCard
    v-if="model.played.length"
    :title="t(`ranking.r11.${title}.title`)"
    :subtitle="t(`ranking.r11.${title}.sub`)"
    flag
  >
    <template #controls>
      <SegmentedControl v-model="view" :options="views" :label="t('ranking.r11.view')" />
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

    <ul
      class="text-body m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs"
      :aria-label="t('ranking.r11.legend')"
    >
      <li v-for="k in KINDS_R11" :key="k" class="inline-flex items-center gap-1.5">
        <span class="inline-block size-3 rounded-sm" :class="KIND_BG[k]" aria-hidden="true" />{{
          KIND_SHORT[k]
        }}
      </li>
    </ul>

    <div v-if="table" class="tw" tabindex="0" role="region" :aria-label="t('ranking.scroll')">
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">
          {{
            t('ranking.r11.tableCaption')
          }}
        </caption>
        <thead>
          <tr class="bg-surface-muted text-muted text-xs uppercase">
            <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.cols.player') }}</th>
            <th v-for="k in KINDS_R11" :key="k" scope="col" class="px-3 py-2.5 text-right">
              {{ KIND_SHORT[k] }}
            </th>
            <th scope="col" class="px-3 py-2.5 text-right">{{ t('ranking.total') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in rows"
            :key="r.p.id"
            class="border-border border-t"
            :class="{ 'bg-tint': r.p.you }"
            :data-me="r.p.you || undefined"
          >
            <th scope="row" class="px-3 py-2 text-left font-medium">{{ r.p.name }}</th>
            <td
              v-for="k in KINDS_R11"
              :key="k"
              class="px-3 py-2 text-right"
              :class="{ 'text-muted text-xs': !avail[k] }"
            >
              {{ avail[k] ? r.hits[k] : na }}
            </td>
            <td class="text-heading px-3 py-2 text-right font-bold">{{ r.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul v-else-if="view === 'count'" class="m-0 flex list-none flex-col gap-1 p-0">
      <li
        v-for="r in rows"
        :key="r.p.id"
        class="grid min-h-8 grid-cols-[110px_minmax(0,1fr)_100px] items-center gap-3 rounded px-1.5 min-[641px]:grid-cols-[160px_minmax(0,1fr)_120px]"
        :class="{ 'bg-tint': r.p.you }"
        :data-me="r.p.you || undefined"
      >
        <span class="truncate text-sm" :class="r.p.you ? 'font-bold' : 'font-medium'"
          >{{ r.p.name }}{{ r.p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}</span
        >
        <span class="flex h-[18px] gap-0.5" role="img" :aria-label="hitsLabel(r.hits)">
          <span
            v-for="k in KINDS_R11"
            :key="k"
            class="rounded-sm"
            :class="KIND_BG[k]"
            :style="{ width: `${(r.hits[k] / first) * 100}%` }"
            :title="tip(k, r.hits[k], r.tries)"
          />
        </span>
        <span class="text-muted text-sm"
          ><b class="text-heading">{{ r.total }}</b> ·
          {{ r.rate == null ? '—' : `${r.rate} %` }}</span
        >
      </li>
    </ul>

    <div
      v-else-if="view === 'grid'"
      class="tw"
      tabindex="0"
      role="region"
      :aria-label="t('ranking.scroll')"
    >
      <div
        class="grid min-w-[560px] grid-cols-[110px_repeat(4,minmax(0,1fr))] items-center gap-x-2 gap-y-1 min-[641px]:grid-cols-[160px_repeat(4,minmax(0,1fr))]"
      >
        <span />
        <span v-for="k in KINDS_R11" :key="k" class="t-up text-muted text-center">{{
          KIND_SHORT[k]
        }}</span>
        <template v-for="r in rows" :key="r.p.id">
          <span class="truncate text-sm" :class="r.p.you ? 'font-bold' : 'font-medium'">{{
            r.p.name
          }}</span>
          <span
            v-for="(k, i) in KINDS_R11"
            :key="k"
            class="bg-surface-muted flex h-9 items-center justify-center gap-2 rounded"
            :class="
              best[i]!.includes(r.p.id)
                ? 'bg-tint font-bold shadow-[inset_0_0_0_2px_var(--color-focus-ring)]'
                : ''
            "
            :title="tip(k, r.hits[k], r.tries)"
          >
            <span
              v-if="r.rates[i] != null"
              class="rounded-full"
              :class="r.p.you ? 'bg-series-you' : 'bg-brand-400'"
              :style="{ width: `${dotSize(r.rates[i]!)}px`, height: `${dotSize(r.rates[i]!)}px` }"
              aria-hidden="true"
            />
            <span class="text-xs tabular-nums" :class="avail[k] ? 'w-10' : 'text-muted px-1'">{{
              pct(r.rates[i], k)
            }}</span>
          </span>
        </template>
      </div>
      <p class="text-muted mt-2 text-xs">{{ t('ranking.r11.gridNote') }}</p>
    </div>

    <div v-else-if="mine" class="flex flex-col gap-3">
      <div
        class="text-muted grid grid-cols-[110px_minmax(0,1fr)_110px] gap-4 text-xs min-[641px]:grid-cols-[200px_minmax(0,1fr)_120px]"
      >
        <span />
        <span class="flex justify-between"
          ><span v-for="v in [0, 25, 50, 75, 100]" :key="v">{{ v }} %</span></span
        >
        <span class="t-up">{{ t('ranking.r11.diff') }}</span>
      </div>
      <div
        v-for="(k, i) in KINDS_R11"
        :key="k"
        class="grid grid-cols-[110px_minmax(0,1fr)_110px] items-center gap-4 min-[641px]:grid-cols-[200px_minmax(0,1fr)_120px]"
      >
        <b class="text-heading text-sm">{{ KIND_LONG[k] }}</b>
        <span v-if="mine.rates[i] != null && avgRates[i] != null" class="relative block h-7">
          <span class="bg-grid absolute inset-x-0 top-1/2 h-px" aria-hidden="true" />
          <span
            class="absolute top-[12px] h-1"
            :class="mine.rates[i]! * 100 >= avgRates[i]! ? 'bg-brand-300' : 'bg-err-tint'"
            :style="{
              left: pos(Math.min(mine.rates[i]! * 100, avgRates[i]!)),
              width: pos(Math.abs(mine.rates[i]! * 100 - avgRates[i]!)),
            }"
            aria-hidden="true"
          />
          <span
            class="bg-surface ring-series-rest absolute top-[7px] size-3.5 -translate-x-1/2 rounded-full ring-[3px] ring-inset"
            :style="{ left: pos(avgRates[i]!) }"
            :title="t('ranking.r11.avgTitle')"
          />
          <span
            class="bg-series-you border-surface absolute top-1.5 size-4 -translate-x-1/2 rounded-full border-2"
            :style="{ left: pos(mine.rates[i]! * 100) }"
            :title="t('ranking.you')"
          />
        </span>
        <span v-else class="text-muted text-sm">{{ avail[k] ? '—' : na }}</span>
        <b
          v-if="mine.rates[i] != null && avgRates[i] != null"
          class="text-sm"
          :class="diffText(mine.rates[i]! * 100, avgRates[i]!).ok ? 'text-ok-fg' : 'text-err-fg'"
          >{{ diffText(mine.rates[i]! * 100, avgRates[i]!).text }}</b
        >
        <span v-else />
      </div>
      <ul class="text-muted m-0 flex list-none flex-wrap gap-x-4 p-0 text-xs">
        <li>
          <span
            class="bg-series-you mr-1.5 inline-block size-3 rounded-full align-middle"
            aria-hidden="true"
          />{{ t('ranking.r11.legendYou') }}
        </li>
        <li>
          <span
            class="ring-series-rest bg-surface mr-1.5 inline-block size-3 rounded-full align-middle ring-[3px] ring-inset"
            aria-hidden="true"
          />{{ t('ranking.r11.legendAvg') }}
        </li>
      </ul>
    </div>

    <p v-if="!hasRules" class="text-muted flex items-center gap-2 text-xs">
      <PIcon name="circle-info" :size="16" />{{ t('ranking.r11.noRules') }}
    </p>
  </RankCard>
</template>
