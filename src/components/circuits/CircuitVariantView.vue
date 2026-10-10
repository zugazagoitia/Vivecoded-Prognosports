<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { circuitLayoutUrl } from '@/api/catalog'
import type { Circuit, GrandPrix } from '@/api/schemas'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import AppImage from '@/components/ui/AppImage.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PTag from '@/components/ui/PTag.vue'
import { focusRing } from '@/components/ui/styles'
import { useNow } from '@/composables/useNow'
import { sessionName } from '@/i18n/sessions'
import {
  POINTS_GP_LIMIT,
  closesIn,
  communityWinner,
  formatAvg,
  formatKm,
  formatOneDecimal,
  gpRankOf,
  gpsWithPoints,
  historyBar,
  isPast,
  nextOpenSession,
  raceDistance,
  sortGpsDesc,
  DASH,
  type BarTone,
  type CircuitVariant,
  type Winner,
} from '@/lib/circuitDetail'
import { useGpPointsList, useVariantGps } from '@/queries/circuitDetail'
import { useCurrentSeason } from '@/queries/circuits'
import { useUserResume } from '@/queries/resources'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { browserTimeZone, formatDate } from '@/utils/dates'
import { formatNumber } from '@/utils/numbers'

const CircuitMap = defineAsyncComponent(() => import('./CircuitMap.vue'))

/** Everything that depends on the selected variant (P4): map, GP table, history, data and plan. */
const props = defineProps<{ circuit: Circuit; variant: CircuitVariant }>()
const { t } = useI18n()
const now = useNow(60_000)
const session = useSessionStore()
const community = useCommunityStore()

/** Personal data (winner, history, predict) needs a session AND an active community. */
const personal = computed(
  () => session.isAuthenticated && session.user != null && community.activeId != null,
)
const tz = computed(() => session.user?.timeZone || browserTimeZone())

const gpsQ = useVariantGps(
  () => props.circuit.id,
  () => props.variant.id,
)
const sorted = computed(() => sortGpsDesc(gpsQ.data.value ?? []))
const limited = computed(() => gpsWithPoints(sorted.value, now.value))
const pointsQ = useGpPointsList(limited, personal)

const gpTo = (gp: GrandPrix) => `/gps/${gp.competition?.id ?? 1}/${gp.season?.id ?? ''}/${gp.id}`

// --- GP table ---------------------------------------------------------------------------
type WinnerCell = 'loading' | 'pending' | 'unknown' | Winner
interface Row {
  key: string
  gp: GrandPrix
  season: string
  date: string
  winner: WinnerCell
}

function winnerOf(gp: GrandPrix): WinnerCell {
  if (!isPast(gp, now.value)) return 'pending'
  const i = limited.value.findIndex((g) => g.id === gp.id && g.season?.id === gp.season?.id)
  const q = i >= 0 ? pointsQ.value[i] : undefined
  if (!q) return 'unknown'
  if (q.isLoading) return 'loading'
  return q.data ? (communityWinner(q.data) ?? 'pending') : 'unknown'
}

const rows = computed<Row[]>(() =>
  sorted.value.map((gp) => ({
    key: `${gp.season?.id}-${gp.id}`,
    gp,
    season: gp.season?.name ?? '',
    date: formatDate(gp.lastSessionDate, tz.value),
    winner: personal.value ? winnerOf(gp) : 'unknown',
  })),
)
const limitNote = computed(() => personal.value && sorted.value.length > POINTS_GP_LIMIT)

// --- Personal history -------------------------------------------------------------------
const upcoming = computed(() => sorted.value.filter((g) => !isPast(g, now.value)).at(-1))

const currentSeason = useCurrentSeason()
const resume = useUserResume(
  () => session.user?.id,
  () => sorted.value[0]?.competition?.id,
  () => currentSeason.data.value?.id,
)
const seasonAvg = computed(() => resume.data.value?.average)

interface HistoryItem {
  key: string
  year: string
  rank?: number
  pts?: number
  pct: number
  tone: BarTone
  pending: boolean
  note?: string
}

const userId = computed(() => session.user?.id)
const playedLoading = computed(() => pointsQ.value.some((q) => q.isLoading))
const playedError = computed(() => pointsQ.value.find((q) => q.isError))
const played = computed(() =>
  limited.value.flatMap((gp, i): HistoryItem[] => {
    const data = pointsQ.value[i]?.data
    const mine = data?.find((p) => String(p.user?.id) === String(userId.value))
    if (!data || mine?.pointsInGP == null) return []
    const max = Math.max(...data.map((p) => p.pointsInGP ?? 0))
    const bar = historyBar(mine.pointsInGP, max, seasonAvg.value)
    return [
      {
        key: `${gp.season?.id}-${gp.id}`,
        year: gp.season?.name ?? '',
        rank: gpRankOf(userId.value!, data),
        pts: mine.pointsInGP,
        pct: bar.pct,
        tone: bar.tone,
        pending: false,
      },
    ]
  }),
)

const openSession = computed(() =>
  upcoming.value ? nextOpenSession(upcoming.value, now.value) : undefined,
)
const pendingItem = computed<HistoryItem | undefined>(() => {
  const gp = upcoming.value
  if (!gp) return undefined
  let note: string | undefined
  const s = openSession.value
  const left = s ? closesIn(s.date, now.value) : undefined
  if (s && left) {
    const info = sessionName(s.code ?? '') ?? sessionName(s.name ?? '')
    const params = {
      article: info?.article ?? 'la',
      session: (info?.long ?? s.name ?? '').toLowerCase(),
      h: left.hours,
      m: left.minutes,
    }
    note =
      left.hours > 0
        ? t('circuits.detail.history.closes', params)
        : t('circuits.detail.history.closesMinutes', params)
  }
  return {
    key: `${gp.season?.id}-${gp.id}`,
    year: gp.season?.name ?? '',
    pct: 0,
    tone: 'muted',
    pending: true,
    note,
  }
})
const items = computed(() => [...(pendingItem.value ? [pendingItem.value] : []), ...played.value])
const avgHere = computed(() =>
  formatAvg(played.value.flatMap((p) => (p.pts == null ? [] : [p.pts]))),
)
const predictTo = computed(() => {
  const gp = upcoming.value
  const s = openSession.value
  return gp && s ? `${gpTo(gp)}/pronosticar/${s.id}` : undefined
})
const historyEmptyText = computed(() => {
  const from = session.user?.created ? new Date(session.user.created).getFullYear() : undefined
  const to = sorted.value[0]?.season?.name
  return from && to
    ? t('circuits.detail.history.emptyText', { from, to })
    : t('circuits.detail.history.emptyTextShort')
})
const toneClass: Record<BarTone, string> = {
  primary: 'bg-primary',
  'brand-300': 'bg-brand-300',
  muted: 'bg-surface-muted',
}
const barLabel = (it: HistoryItem) =>
  it.pending
    ? t('circuits.detail.history.barPending', { year: it.year })
    : t('circuits.detail.history.barDone', { year: it.year, n: it.pts ?? 0 }, it.pts ?? 0)

// --- Layout data ------------------------------------------------------------------------
const laps = computed(() => sorted.value.find((g) => g.laps != null)?.laps)
const dataRows = computed(() => {
  const dist = raceDistance(props.variant.distance, laps.value)
  return [
    { k: 'length', v: props.variant.distance != null ? formatKm(props.variant.distance, 3) : '' },
    { k: 'laps', v: laps.value != null ? formatNumber(laps.value) : '' },
    { k: 'distance', v: dist != null ? formatKm(dist, 1) : '' },
    { k: 'turns', v: props.variant.turns != null ? formatNumber(props.variant.turns) : '' },
  ].filter((r) => r.v)
})
const layoutUrl = computed(() =>
  props.variant.hasLayoutImage ? circuitLayoutUrl(props.circuit.id, props.variant.id) : undefined,
)
const hasCoords = computed(() => props.circuit.latitude != null && props.circuit.longitude != null)

async function retryGps() {
  await Promise.all([
    gpsQ.refetch(),
    ...pointsQ.value.filter((q) => q.isError).map((q) => q.refetch()),
  ])
}
</script>

<template>
  <div
    class="flex flex-col gap-6 min-[901px]:grid min-[901px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] min-[901px]:items-start"
  >
    <div
      class="contents min-[901px]:flex min-[901px]:min-w-0 min-[901px]:flex-col min-[901px]:gap-6"
    >
      <PCard v-if="hasCoords" class="order-1">
        <CircuitMap
          :latitude="circuit.latitude!"
          :longitude="circuit.longitude!"
          :circuit="circuit.name ?? ''"
          :locality="circuit.locality ?? ''"
        />
      </PCard>

      <PCard class="order-4">
        <template #header>
          <h2 class="t-header text-heading">{{ t('circuits.detail.gps.title') }}</h2>
          <span class="text-muted text-sm">{{
            t('circuits.detail.gps.layout', { name: variant.name })
          }}</span>
        </template>
        <ErrorState
          v-if="gpsQ.isError.value"
          :what="t('circuits.detail.gps.error')"
          :error="gpsQ.error.value"
          @retry="retryGps()"
        />
        <Skeleton v-else-if="gpsQ.isLoading.value" variant="table" :rows="3" />
        <EmptyState
          v-else-if="rows.length === 0"
          icon="route"
          :title="t('circuits.detail.gps.empty')"
        />
        <div v-else class="flex flex-col gap-3">
          <div class="ring-border overflow-x-auto rounded-lg ring-1">
            <table class="w-full border-collapse text-sm leading-5">
              <caption class="sr-only">
                {{
                  t('circuits.detail.gps.caption', { name: variant.name })
                }}
              </caption>
              <thead>
                <tr class="bg-surface-muted text-muted text-left text-xs uppercase">
                  <th scope="col" class="border-border border-b px-3 py-2.5 whitespace-nowrap">
                    {{ t('circuits.detail.gps.season') }}
                  </th>
                  <th scope="col" class="border-border border-b px-3 py-2.5 whitespace-nowrap">
                    {{ t('circuits.detail.gps.gp') }}
                  </th>
                  <th scope="col" class="border-border border-b px-3 py-2.5 whitespace-nowrap">
                    {{ t('circuits.detail.gps.date') }}
                  </th>
                  <th
                    v-if="personal"
                    scope="col"
                    class="border-border border-b px-3 py-2.5 whitespace-nowrap"
                  >
                    {{ t('circuits.detail.gps.winner') }}
                  </th>
                  <th
                    v-if="personal"
                    scope="col"
                    class="border-border border-b px-3 py-2.5 text-right whitespace-nowrap"
                  >
                    {{ t('circuits.detail.gps.points') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.key" class="group">
                  <th
                    scope="row"
                    class="border-border text-heading border-b px-3 py-2.5 font-bold whitespace-nowrap group-last:border-b-0"
                  >
                    {{ r.season }}
                  </th>
                  <td class="border-border border-b px-3 py-2.5 group-last:border-b-0">
                    <RouterLink
                      :to="gpTo(r.gp)"
                      :class="[
                        'text-link inline-flex min-h-11 items-center font-medium underline md:min-h-6',
                        focusRing,
                      ]"
                      >{{ r.gp.name }}</RouterLink
                    >
                  </td>
                  <td
                    class="border-border border-b px-3 py-2.5 whitespace-nowrap group-last:border-b-0"
                  >
                    {{ r.date }}
                  </td>
                  <td
                    v-if="personal"
                    class="border-border border-b px-3 py-2.5 group-last:border-b-0"
                  >
                    <template v-if="r.winner === 'loading'">
                      <span class="skel inline-block h-4 w-24 align-middle" aria-hidden="true" />
                      <span class="sr-only">{{ t('loading') }}</span>
                    </template>
                    <span v-else-if="r.winner === 'pending'" class="text-muted">{{
                      t('circuits.detail.gps.pending')
                    }}</span>
                    <span v-else-if="r.winner === 'unknown'" class="text-muted">{{ DASH }}</span>
                    <span v-else>{{ r.winner.names.join(t('circuits.detail.gps.tie')) }}</span>
                  </td>
                  <td
                    v-if="personal"
                    class="border-border border-b px-3 py-2.5 text-right tabular-nums group-last:border-b-0"
                  >
                    {{ typeof r.winner === 'object' ? formatNumber(r.winner.points) : DASH }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="limitNote" class="text-muted text-xs">
            {{ t('circuits.detail.gps.limit', { n: POINTS_GP_LIMIT }) }}
          </p>
        </div>
      </PCard>
    </div>

    <div
      class="contents min-[901px]:flex min-[901px]:min-w-0 min-[901px]:flex-col min-[901px]:gap-6"
    >
      <PCard v-if="personal" class="order-2">
        <template #header>
          <div class="flex min-w-0 flex-col gap-0.5">
            <h2 class="t-header text-heading">{{ t('circuits.detail.history.title') }}</h2>
            <span class="text-muted text-xs">{{
              t('circuits.detail.history.subtitle', {
                community: community.active?.name ?? '',
                variant: variant.name,
              })
            }}</span>
          </div>
          <PTag color="brand">{{ t('circuits.detail.history.you') }}</PTag>
        </template>
        <ErrorState
          v-if="gpsQ.isError.value || playedError"
          :what="t('circuits.detail.history.error')"
          :error="playedError?.error ?? gpsQ.error.value"
          @retry="retryGps()"
        />
        <div v-else-if="gpsQ.isLoading.value || playedLoading" class="flex flex-col gap-3">
          <Skeleton variant="card" />
        </div>
        <EmptyState
          v-else-if="items.length === 0"
          icon="history"
          :title="t('circuits.detail.history.emptyTitle')"
          :text="historyEmptyText"
        />
        <div v-else class="flex flex-col gap-3">
          <ul class="flex flex-col gap-3">
            <li v-for="it in items" :key="it.key" class="flex flex-col gap-1">
              <div class="flex items-baseline justify-between gap-3 text-sm">
                <span class="text-heading font-bold">{{ it.year }}</span>
                <span class="text-muted">
                  {{
                    it.pending
                      ? t('circuits.detail.history.thisWeekend')
                      : t('circuits.detail.history.rank', { n: it.rank ?? DASH })
                  }}
                </span>
                <span class="text-heading ml-auto font-semibold tabular-nums">{{
                  it.pts != null
                    ? t('circuits.detail.history.pts', { n: formatNumber(it.pts) }, it.pts)
                    : DASH
                }}</span>
              </div>
              <div
                role="img"
                :aria-label="barLabel(it)"
                class="bg-surface-muted ring-border h-2 overflow-hidden rounded-full ring-1"
              >
                <div
                  :class="['h-full rounded-full', toneClass[it.tone]]"
                  :style="{ width: `${it.pct}%` }"
                />
              </div>
              <p v-if="it.note" class="text-muted text-xs">{{ it.note }}</p>
            </li>
          </ul>
          <dl class="border-border flex flex-col gap-1.5 border-t pt-2.5 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-muted">{{ t('circuits.detail.history.avgHere') }}</dt>
              <dd class="text-heading font-bold tabular-nums">
                {{
                  avgHere === DASH ? avgHere : t('circuits.detail.history.pts', { n: avgHere }, 2)
                }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-muted">{{ t('circuits.detail.history.avgSeason') }}</dt>
              <dd class="text-heading font-bold tabular-nums">
                {{
                  seasonAvg == null
                    ? DASH
                    : t('circuits.detail.history.pts', { n: formatOneDecimal(seasonAvg) }, 2)
                }}
              </dd>
            </div>
          </dl>
          <PButton
            v-if="predictTo && upcoming"
            :to="predictTo"
            variant="soft"
            size="sm"
            icon="pen-to-square"
          >
            {{
              t('circuits.detail.history.predict', {
                gp: circuit.country,
                year: upcoming.season?.name,
              })
            }}
          </PButton>
        </div>
      </PCard>

      <PCard :title="t('circuits.detail.data.title')" class="order-3">
        <Skeleton
          v-if="gpsQ.isLoading.value && variant.distance == null"
          variant="line"
          :lines="4"
        />
        <dl v-else class="flex flex-col gap-2 text-sm">
          <div v-for="r in dataRows" :key="r.k" class="flex justify-between gap-3">
            <dt class="text-muted">{{ t(`circuits.detail.data.${r.k}`) }}</dt>
            <dd class="text-heading font-bold tabular-nums">{{ r.v }}</dd>
          </div>
        </dl>
      </PCard>

      <PCard :title="t('circuits.detail.plan.title')" class="order-5">
        <div class="flex justify-center">
          <div v-if="layoutUrl" class="rounded-md bg-white p-3">
            <AppImage
              :src="layoutUrl"
              :alt="t('circuits.detail.plan.alt', { circuit: circuit.name, variant: variant.name })"
              :width="300"
              :height="200"
              class="h-auto max-w-full object-contain"
            />
          </div>
          <EmptyState v-else icon="route" :title="t('circuits.detail.plan.empty')" />
        </div>
      </PCard>
    </div>
  </div>
</template>
