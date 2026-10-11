<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { rankPath } from '@/components/layout/rankNav'
import { ErrorState, Skeleton } from '@/components/states'
import Avatar from '@/components/ui/Avatar.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'
import { useNow } from '@/composables/useNow'
import { useFlag } from '@/flags'
import { gpPath, gpShortName, sessionLabel, sessionPath, sortedSessions } from '@/lib/gp'
import {
  compactMovement,
  firstName,
  formatDec,
  formatMovement,
  minus,
  movementLabel,
  percentileOf,
} from '@/lib/ranking'
import {
  endValue,
  formCell,
  gapAxisLabel,
  gapToLeader,
  gapToLeaderSeries,
  gpAverage,
  gpWinners,
  lastForm,
  leadAt,
  podiumOrder,
  pointsBarPct,
  topFiveAndMe,
  yAxisMin,
} from '@/lib/rankingTable'
import { useNextGp } from '@/queries/gps'
import { isNotFound } from '@/queries/community'
import type { Ranking } from '@/queries/ranking'
import { formatCloseIn } from '@/lib/gp'
import { isClosed, closesAt } from '@/utils/dates'
import RankLineChart from './RankLineChart.vue'
import type { LineSeries } from './chartTypes'
import type { Tone } from '@/components/charts/model'

/** R0 · Resumen del ranking: 4 KPI, top 10, podio, último y próximo GP, lucha por el título. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const route = useRoute()
const now = useNow(30_000)
const gapOn = useFlag('GAP')

const model = computed(() => props.rk.model.value!)
const me = computed(() => model.value.me)
const n = computed(() => model.value.played.length)
const players = computed(() => model.value.players)
const leader = computed(() => players.value[0])
const ctx = computed(() => ({
  comunidad: String((route.params as Record<string, string>).comunidad),
  temporada: props.rk.season.value?.id ?? '',
}))
const link = (sub: string) => rankPath(ctx.value, sub)
const profile = (p: { id: number; you: boolean }) => (p.you ? '/u' : `/u/${p.id}`)

// KPI
const prevPos = computed(() =>
  me.value && n.value > 1 ? me.value.places[n.value - 2]! : (me.value?.pos ?? 0),
)
const pct = computed(() =>
  percentileOf(
    me.value?.avg ?? 0,
    players.value.map((p) => p.avg),
  ),
)
const moveClass = computed(() => {
  const m = me.value?.move ?? 0
  return m > 0 ? 'text-ok-fg' : m < 0 ? 'text-err-fg' : 'text-muted'
})

// Top 10
const top = computed(() => players.value.slice(0, 10))
const lead = computed(() => leader.value?.total ?? 0)
const formTitle = (g: number, place: number) => `${model.value.played[g]?.name ?? ''}: ${place}.º`

// Podium
const podium = computed(() => podiumOrder(players.value.slice(0, 3)))

// Last GP
const last = computed(() => (n.value ? n.value - 1 : -1))
const lastGp = computed(() => model.value.played[last.value])
const winners = computed(() => gpWinners(model.value, last.value))
const lastLink = computed(() => {
  const g = lastGp.value
  if (!g) return '/gps'
  const base = `/gps/${props.rk.competition.value ?? 1}/${props.rk.season.value?.id}/${g.id}`
  const s = [...g.sessions]
    .sort((a, b) => Date.parse(a.date ?? '') - Date.parse(b.date ?? ''))
    .at(-1)
  return s ? `${base}/resultados/${s.id}` : base
})

// Next GP
const next = useNextGp(() => props.rk.competition.value)
const nextNone = computed(() => next.isError.value && isNotFound(next.error.value))
const nextSession = computed(() =>
  next.data.value
    ? sortedSessions(next.data.value).find((s) => !isClosed(s, now.value))
    : undefined,
)
const nextClose = computed(() => {
  const c = nextSession.value ? closesAt(nextSession.value) : null
  return c ? formatCloseIn((c.getTime() - now.value) / 60_000) : ''
})
const nextSessionText = computed(() => {
  const w = nextSession.value ? sessionLabel(nextSession.value).withArticle : ''
  return w.charAt(0).toUpperCase() + w.slice(1)
})

// Chart
const lead_ = computed(() => leadAt(model.value))
const chartPlayers = computed(() => topFiveAndMe(model.value))
const chartSeries = computed<LineSeries[]>(() => {
  const tones: Tone[] = ['s2', 's3', 's4', 's5', 's6']
  let k = 0
  const list = chartPlayers.value.map((p) => ({
    p,
    tone: (p.you ? 'you' : tones[k++]) as Tone,
  }))
  const values = (p: (typeof list)[number]['p']) => gapToLeaderSeries(p, lead_.value)
  return [...list.filter((x) => !x.p.you), ...list.filter((x) => x.p.you)].map(({ p, tone }) => {
    const v = values(p)
    return {
      id: p.id,
      label: p.you ? t('ranking.you') : firstName(p.name),
      tone,
      width: p.you ? 3.5 : 2,
      values: v,
      end: endValue(v.at(-1) ?? 0),
    }
  })
})
const yMin = computed(() =>
  yAxisMin(
    chartSeries.value.flatMap((s) => s.values),
    20,
  ),
)
const ticks = computed(() => {
  const out = []
  for (let v = 0; v >= yMin.value; v -= 20) out.push({ v, label: gapAxisLabel(v), zero: v === 0 })
  return out
})
</script>

<template>
  <div v-if="n > 0 && me" class="flex flex-col gap-6">
    <section class="grid4" :aria-label="t('ranking.r0.kpis')">
      <PCard padded class="!p-0">
        <dl class="flex flex-col gap-0.5 px-5 py-4" data-kpi="position">
          <dt class="text-muted text-xs font-semibold tracking-wide uppercase">
            {{ t('ranking.r0.position') }}
          </dt>
          <dd class="text-heading text-[28px] leading-9 font-bold tabular-nums">
            {{ t('ranking.ordinal', { n: me.pos }) }}
          </dd>
          <dd class="text-xs font-bold" :class="moveClass">
            {{ formatMovement(prevPos, me.pos) }}
          </dd>
        </dl>
      </PCard>
      <PCard class="!p-0">
        <dl class="flex flex-col gap-0.5 px-5 py-4" data-kpi="points">
          <dt class="text-muted text-xs font-semibold tracking-wide uppercase">
            {{ t('ranking.r0.points') }}
          </dt>
          <dd class="text-heading text-[28px] leading-9 font-bold tabular-nums">{{ me.total }}</dd>
          <dd class="text-muted text-[13px]">
            {{ t('ranking.r0.toLeader', { n: gapToLeader(model, me) }) }}
          </dd>
        </dl>
      </PCard>
      <PCard class="!p-0">
        <dl class="flex flex-col gap-0.5 px-5 py-4" data-kpi="avg">
          <dt class="text-muted text-xs font-semibold tracking-wide uppercase">
            {{ t('ranking.r0.avg') }}
          </dt>
          <dd class="text-heading text-[28px] leading-9 font-bold tabular-nums">
            {{ formatDec(me.avg) }}
          </dd>
          <dd class="text-muted text-[13px]">{{ t('ranking.r0.betterThan', { pct }) }}</dd>
        </dl>
      </PCard>
      <PCard class="!p-0">
        <dl class="flex flex-col gap-0.5 px-5 py-4" data-kpi="wins">
          <dt class="text-muted text-xs font-semibold tracking-wide uppercase">
            {{ t('ranking.r0.wins') }}
          </dt>
          <dd class="text-heading text-[28px] leading-9 font-bold tabular-nums">{{ me.wins }}</dd>
          <dd class="text-muted text-[13px]">{{ t('ranking.r0.ofPlayed', { n }) }}</dd>
        </dl>
      </PCard>
    </section>

    <div class="split">
      <PCard :title="t('ranking.r0.standings')" :padded="false">
        <template #header>
          <h2 class="t-header text-heading">{{ t('ranking.r0.standings') }}</h2>
          <RouterLink
            :to="link('clasificacion/general')"
            :class="['text-link text-sm font-medium', focusRing]"
          >
            {{ t('ranking.r0.seeFull') }}
          </RouterLink>
        </template>
        <div class="tw">
          <table class="w-full border-collapse text-sm tabular-nums">
            <caption class="sr-only">
              {{
                t('ranking.r0.standings')
              }}
            </caption>
            <thead>
              <tr class="bg-surface-muted text-muted text-xs uppercase">
                <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.cols.pos') }}</th>
                <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.cols.player') }}</th>
                <th scope="col" class="px-3 py-2.5 text-left">{{ t('ranking.r0.form') }}</th>
                <th scope="col" class="px-3 py-2.5 text-right">{{ t('ranking.cols.points') }}</th>
                <th scope="col" class="px-3 py-2.5 text-right">
                  {{ t('ranking.cols.gapLeader') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in top"
                :key="p.id"
                class="border-border hover:bg-surface-hover border-t"
                :class="{ 'bg-tint': p.you }"
                :data-me="p.you || undefined"
              >
                <td class="px-3 py-2.5 whitespace-nowrap">
                  <b class="text-heading">{{ p.pos }}</b>
                  <span
                    class="ml-1 text-xs font-bold"
                    :class="p.move > 0 ? 'text-ok-fg' : 'text-err-fg'"
                  >
                    <span aria-hidden="true">{{ compactMovement(p.move) }}</span>
                    <span v-if="p.move" class="sr-only">{{ movementLabel(p.move) }}</span>
                  </span>
                </td>
                <td class="px-3 py-2.5">
                  <RouterLink
                    :to="profile(p)"
                    :class="['text-heading inline-flex items-center gap-2 font-medium', focusRing]"
                  >
                    <Avatar :name="p.name" :size="24" :you="p.you" />
                    {{ p.name }}{{ p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}
                  </RouterLink>
                </td>
                <td class="px-3 py-2.5">
                  <span class="inline-flex gap-1">
                    <span
                      v-for="f in lastForm(p)"
                      :key="f.g"
                      :title="formTitle(f.g, f.place)"
                      :aria-label="formTitle(f.g, f.place)"
                      role="img"
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
                <td class="px-3 py-2.5 text-right">
                  <span class="inline-flex items-center justify-end gap-2">
                    <span
                      class="bg-surface-muted inline-block h-1.5 w-20 overflow-hidden rounded-full"
                      aria-hidden="true"
                    >
                      <span
                        class="block h-full rounded-full"
                        :class="p.you ? 'bg-series-you' : 'bg-brand-300'"
                        :style="{ width: `${pointsBarPct(p.total, lead)}%` }"
                      />
                    </span>
                    <b class="text-heading">{{ p.total }}</b>
                  </span>
                </td>
                <td class="text-muted px-3 py-2.5 text-right">
                  {{ p.pos === 1 ? '—' : minus(lead - p.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <template #footer>
          <p class="text-muted mr-auto text-xs">{{ t('ranking.r0.formNote') }}</p>
        </template>
      </PCard>

      <aside class="flex min-w-0 flex-col gap-4">
        <PCard>
          <h2 class="t-header text-heading mb-3">{{ t('ranking.r0.podium') }}</h2>
          <ol class="m-0 flex h-[180px] list-none items-end gap-2 p-0">
            <li
              v-for="s in podium"
              :key="s.place"
              class="flex flex-1 flex-col items-center gap-1.5"
            >
              <span class="text-heading text-sm font-semibold">{{ firstName(s.item.name) }}</span>
              <span class="text-muted text-xs tabular-nums"
                >{{ s.item.total }} {{ t('ranking.pts') }}</span
              >
              <span
                class="flex w-full justify-center rounded-t-md pt-2 text-xl font-bold"
                :class="s.place === 1 ? 'bg-primary text-on-primary' : 'bg-tint text-tint-fg'"
                :style="{ height: `${s.height - 50}px` }"
                :data-height="s.height"
                >{{ s.place }}</span
              >
            </li>
          </ol>
        </PCard>

        <PCard v-if="lastGp">
          <h2 class="t-header text-heading mb-2">
            {{ t('ranking.r0.lastGp', { name: lastGp.name }) }}
          </h2>
          <dl class="flex flex-col gap-2 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-muted">{{ t('ranking.r0.winner') }}</dt>
              <dd class="text-heading font-semibold">
                {{
                  winners.length
                    ? `${winners.map((w) => w.name).join(', ')} · ${winners[0]!.pts[last]} ${t('ranking.pts')}`
                    : '—'
                }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-muted">{{ t('ranking.r0.yourPoints') }}</dt>
              <dd class="text-heading font-semibold">
                {{ me.pts[last] }} {{ t('ranking.pts') }} ({{
                  t('ranking.ordinal', { n: me.gpPlaces[last] })
                }})
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-muted">{{ t('ranking.r0.communityAvg') }}</dt>
              <dd class="text-heading font-semibold">{{ formatDec(gpAverage(model, last)) }}</dd>
            </div>
          </dl>
          <RouterLink
            :to="lastLink"
            :class="[
              'text-link mt-3 inline-flex items-center gap-1 text-sm font-medium',
              focusRing,
            ]"
          >
            {{ t('ranking.r0.seeGp') }} <PIcon name="arrow-right" :size="16" />
          </RouterLink>
        </PCard>

        <PCard>
          <Skeleton v-if="next.isLoading.value" variant="line" :lines="3" />
          <p
            v-else-if="nextNone || (next.isSuccess.value && !next.data.value)"
            class="text-muted text-sm"
          >
            {{ t('ranking.r0.noNext') }}
          </p>
          <ErrorState
            v-else-if="next.isError.value"
            :what="t('ranking.r0.nextWhat')"
            :error="next.error.value"
            @retry="next.refetch()"
          />
          <div
            v-else-if="next.data.value"
            class="bg-tint flex flex-col gap-1.5 rounded-lg px-5 py-4"
          >
            <span class="text-tint-fg text-xs font-semibold tracking-wide uppercase">{{
              t('ranking.r0.nextGp')
            }}</span>
            <b class="t-header text-heading">
              {{
                t('ranking.r0.nextName', {
                  name: gpShortName(next.data.value),
                  round: next.data.value.round ?? '',
                })
              }}
            </b>
            <template v-if="nextSession">
              <span class="text-tint-fg text-sm">{{
                t('ranking.r0.closesIn', { session: nextSessionText, time: nextClose })
              }}</span>
              <PButton
                size="sm"
                class="self-start"
                :to="sessionPath(next.data.value, 'pronosticar', nextSession)"
              >
                {{ t('ranking.r0.predict') }}
              </PButton>
            </template>
          </div>
        </PCard>
      </aside>
    </div>

    <PCard>
      <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="t-header text-heading">{{ t('ranking.r0.race') }}</h2>
          <p class="text-muted text-sm">{{ t('ranking.r0.raceSub') }}</p>
        </div>
        <RouterLink
          v-if="gapOn"
          :to="link('evolucion/gap')"
          :class="['text-link text-sm font-medium', focusRing]"
        >
          {{ t('ranking.r0.seeEvolution') }}
        </RouterLink>
      </div>
      <RankLineChart
        :series="chartSeries"
        :x-codes="model.played.map((g) => g.code)"
        :x-names="model.played.map((g) => g.name)"
        :domain="[yMin, 0]"
        :ticks="ticks"
        :width="1100"
        :height="260"
        show-x
        :label="t('ranking.r0.raceAria')"
        :cell="(v: number) => (v === 0 ? t('ranking.leader') : minus(v))"
      />
    </PCard>
  </div>
  <div v-else-if="n === 0" class="flex flex-col gap-6">
    <PCard>
      <p class="text-muted text-sm">{{ t('ranking.r0.empty') }}</p>
    </PCard>
    <PCard>
      <p v-if="nextNone" class="text-muted text-sm">{{ t('ranking.r0.noNext') }}</p>
      <div v-else-if="next.data.value" class="flex flex-col gap-1.5">
        <b class="t-header text-heading">{{
          t('ranking.r0.nextName', {
            name: gpShortName(next.data.value),
            round: next.data.value.round ?? '',
          })
        }}</b>
        <RouterLink :to="gpPath(next.data.value)" :class="['text-link text-sm', focusRing]">{{
          t('ranking.r0.seeGp')
        }}</RouterLink>
      </div>
    </PCard>
  </div>
  <PCard v-else
    ><p class="text-muted text-sm">{{ t('ranking.r0.notPlaying') }}</p></PCard
  >
</template>
