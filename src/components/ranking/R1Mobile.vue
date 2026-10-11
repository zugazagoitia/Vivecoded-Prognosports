<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { rankPath } from '@/components/layout/rankNav'
import { useRankNav } from '@/components/layout/useRankNav'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing, controlBase } from '@/components/ui/styles'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import type { Tone } from '@/components/charts/model'
import { useFlag } from '@/flags'
import { compactMovement, firstName, formatDec, minus, type RankPlayer } from '@/lib/ranking'
import {
  endValue,
  formCell,
  gapLabel,
  gapToLeaderSeries,
  lastForm,
  leadAt,
  mbarHeights,
  topFiveAndMe,
  yAxisMin,
  gapAxisLabel,
} from '@/lib/rankingTable'
import type { Ranking } from '@/queries/ranking'
import RankLineChart from './RankLineChart.vue'
import type { LineSeries } from './chartTypes'

/** R1m · Clasificación móvil: selectores, vista (Clasificación / Evolución / Por GP) y tu posición. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const route = useRoute()
const nav = useRankNav()
const gapOn = useFlag('GAP')

const model = computed(() => props.rk.model.value!)
const me = computed(() => model.value.me)
const players = computed(() => model.value.players)
const view = ref(0)
const open = ref<number | null>(me.value?.id ?? null)

const communities = computed(() => props.rk.communities.data.value ?? [])
const seasons = computed(() => props.rk.seasons.data.value ?? [])
const communityId = computed({
  get: () => Number((route.params as Record<string, string>).comunidad),
  set: (v) => void nav.changeCommunity(Number(v)),
})
const seasonId = computed({
  get: () => props.rk.season.value?.id ?? 0,
  set: (v) => void nav.changeSeason(Number(v)),
})
const views = computed(() => [
  { value: 0, label: t('ranking.r1m.views.standings') },
  { value: 1, label: t('ranking.r1m.views.evolution') },
  { value: 2, label: t('ranking.r1m.views.perGp') },
])
const gap = (p: RankPlayer) => (players.value[0]?.total ?? 0) - p.total
const moveText = computed(() => {
  const m = me.value?.move ?? 0
  return m > 0 ? `▲ ${m}` : m < 0 ? `▼ ${-m}` : t('ranking.r1m.same')
})
const toggle = (id: number) => (open.value = open.value === id ? null : id)

// Evolution
const lead = computed(() => leadAt(model.value))
const series = computed<LineSeries[]>(() => {
  const tones: Tone[] = ['s2', 's3', 's4', 's5', 's6']
  let k = 0
  const list = topFiveAndMe(model.value).map((p) => ({
    p,
    tone: (p.you ? 'you' : tones[k++]) as Tone,
  }))
  return [...list.filter((x) => !x.p.you), ...list.filter((x) => x.p.you)].map(({ p, tone }) => ({
    id: p.id,
    label: p.you ? t('ranking.you') : firstName(p.name),
    tone,
    width: p.you ? 3 : 1.8,
    values: gapToLeaderSeries(p, lead.value),
    end: endValue(gapToLeaderSeries(p, lead.value).at(-1) ?? 0),
  }))
})
const yMin = computed(() =>
  yAxisMin(
    series.value.flatMap((s) => s.values),
    20,
  ),
)

// By GP: last five
const lastGps = computed(() => model.value.played.slice(-5))
const offset = computed(() => model.value.played.length - lastGps.value.length)
const evolutionLink = computed(() =>
  rankPath(
    {
      comunidad: String((route.params as Record<string, string>).comunidad),
      temporada: seasonId.value,
    },
    'evolucion/gap',
  ),
)
const selectClass = `${controlBase} md:min-h-11`
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="sr-only">{{ t('ranking.title') }}</h1>
    <div class="flex gap-2">
      <div class="min-w-0 flex-1">
        <select v-model="communityId" :aria-label="t('ranking.community')" :class="selectClass">
          <option v-for="c in communities" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <select v-model="seasonId" :aria-label="t('ranking.season')" :class="selectClass">
          <option v-for="s in seasons" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
    </div>

    <SegmentedControl
      v-model="view"
      :options="views"
      :label="t('ranking.r1m.view')"
      class="w-full"
    />

    <div
      v-if="me"
      class="bg-primary text-on-primary flex items-center gap-3.5 rounded-lg px-4 py-3.5"
      data-mine
    >
      <span class="text-[30px] leading-9 font-bold tabular-nums">{{
        t('ranking.ordinal', { n: me.pos })
      }}</span>
      <div class="flex min-w-0 flex-1 flex-col">
        <b>{{ t('ranking.r0.position') }}</b>
        <span class="text-sm opacity-90">{{
          t('ranking.r1m.mine', { gap: gap(me), move: moveText })
        }}</span>
      </div>
      <b class="text-lg tabular-nums">{{ me.total }}</b>
    </div>

    <section v-if="view === 0" class="bg-surface ring-card-ring overflow-hidden rounded-lg ring-1">
      <div class="text-muted flex gap-2 px-3 py-2 text-xs uppercase">
        <span class="w-7">{{ t('ranking.cols.posShort') }}</span>
        <span class="flex-1">{{ t('ranking.cols.player') }}</span>
        <span class="w-14 text-right">{{ t('ranking.cols.pointsShort') }}</span>
        <span class="w-5" />
      </div>
      <template v-for="(p, i) in players" :key="p.id">
        <button
          type="button"
          :aria-expanded="open === p.id"
          :class="[
            'border-border flex min-h-14 w-full cursor-pointer items-center gap-2 border-t px-3 text-left',
            p.you ? 'bg-tint' : '',
            focusRing,
          ]"
          @click="toggle(p.id)"
        >
          <span class="w-7 text-[15px] font-bold tabular-nums">{{ p.pos }}</span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="text-heading truncate text-[15px] font-medium">{{
              p.you ? `${p.name} (${t('ranking.you').toLowerCase()})` : p.name
            }}</span>
            <span class="text-muted text-xs">
              {{ gapLabel(i, gap(p)) }}
              <span :class="p.move > 0 ? 'text-ok-fg' : 'text-err-fg'" class="font-bold">{{
                compactMovement(p.move)
              }}</span>
            </span>
          </span>
          <span class="w-14 text-right font-bold tabular-nums">{{ p.total }}</span>
          <PIcon name="chevron-down" :size="16" :class="open === p.id ? 'rotate-180' : ''" />
        </button>
        <div
          v-if="open === p.id"
          class="grid gap-2.5 py-1 pr-3 pb-3.5 pl-12"
          :class="p.you ? 'bg-tint' : ''"
          data-detail
        >
          <div class="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span class="text-muted block text-xs">{{ t('ranking.r1.cols.avg') }}</span
              ><b>{{ formatDec(p.avg) }}</b>
            </div>
            <div>
              <span class="text-muted block text-xs">{{ t('ranking.r1.cols.wins') }}</span
              ><b>{{ p.wins }}</b>
            </div>
            <div>
              <span class="text-muted block text-xs">{{ t('ranking.r1m.formLabel') }}</span>
              <span class="inline-flex gap-0.5">
                <span
                  v-for="f in lastForm(p)"
                  :key="f.g"
                  class="inline-flex h-[22px] w-5 items-center justify-center rounded text-[11px] font-bold"
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
            </div>
          </div>
          <div
            class="flex h-11 items-end gap-0.5"
            role="img"
            :aria-label="t('ranking.r1m.barsAria')"
          >
            <span
              v-for="(h, g) in mbarHeights(p.pts)"
              :key="g"
              class="min-h-0.5 flex-1 rounded-t-sm"
              :class="p.gpPlaces[g] === 1 && (p.pts[g] ?? 0) > 0 ? 'bg-primary' : 'bg-brand-300'"
              :style="{ height: `${h}%` }"
            />
          </div>
          <span class="text-muted text-xs">
            {{
              t('ranking.r1m.barsNote', {
                from: model.played[0]?.code,
                to: model.played.at(-1)?.code,
              })
            }}
          </span>
        </div>
      </template>
    </section>

    <section
      v-else-if="view === 1"
      class="bg-surface ring-card-ring flex flex-col gap-2 rounded-lg p-4 ring-1"
    >
      <b class="text-heading">{{ t('ranking.r1m.evoTitle') }}</b>
      <RankLineChart
        :series="series"
        :x-codes="model.played.map((g) => g.code)"
        :x-names="model.played.map((g) => g.name)"
        :domain="[yMin, 0]"
        :ticks="[
          { v: 0, label: gapAxisLabel(0), zero: true },
          { v: yMin, label: yMin === 0 ? '' : minus(yMin) },
        ]"
        :width="340"
        :height="200"
        :pad-left="40"
        :pad-right="70"
        :label-gap="13"
        :font-size="11"
        :min-width="0"
        :label="t('ranking.r1m.evoAria')"
        :cell="(v: number) => (v === 0 ? t('ranking.leader') : minus(v))"
      />
      <RouterLink
        v-if="gapOn"
        :to="evolutionLink"
        :class="[
          'text-tint-fg bg-tint inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold',
          focusRing,
        ]"
      >
        {{ t('ranking.r1m.allViews') }}
      </RouterLink>
    </section>

    <section v-else class="bg-surface ring-card-ring overflow-hidden rounded-lg ring-1">
      <div class="tw">
        <table class="w-full border-collapse text-sm tabular-nums">
          <caption class="sr-only">
            {{
              t('ranking.r1m.perGpCaption')
            }}
          </caption>
          <thead>
            <tr class="bg-surface-muted text-muted text-xs uppercase">
              <th scope="col" class="px-3 py-2 text-left">{{ t('ranking.cols.player') }}</th>
              <th v-for="g in lastGps" :key="g.id" scope="col" class="px-2 py-2 text-center">
                {{ g.code }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in players"
              :key="p.id"
              class="border-border border-t"
              :class="{ 'bg-tint': p.you }"
            >
              <th scope="row" class="px-3 py-2 text-left font-medium whitespace-nowrap">
                {{ p.you ? t('ranking.you') : firstName(p.name) }}
              </th>
              <td v-for="(g, i) in lastGps" :key="g.id" class="px-1 py-1 text-center">
                <span
                  class="inline-block min-w-8 rounded px-1 py-1"
                  :class="
                    p.gpPlaces[offset + i] === 1 && (p.pts[offset + i] ?? 0) > 0 ? 'rk-sq6' : ''
                  "
                  >{{ p.pts[offset + i] }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-muted border-border border-t px-3 py-2 text-xs">
        {{ t('ranking.r1m.perGpNote') }}
      </p>
    </section>
  </div>
</template>
