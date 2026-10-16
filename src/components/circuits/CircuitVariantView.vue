<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { circuitLayoutUrl } from '@/api/catalog'
import type { Circuit, GrandPrix } from '@/api/schemas'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import AppImage from '@/components/ui/AppImage.vue'
import PCard from '@/components/ui/PCard.vue'
import { focusRing } from '@/components/ui/styles'
import { useNow } from '@/composables/useNow'
import {
  communityWinner,
  formatKm,
  gpsWithPoints,
  isPast,
  raceDistance,
  sortGpsDesc,
  DASH,
  type CircuitVariant,
  type Winner,
} from '@/lib/circuitDetail'
import { useGpPointsList, useVariantGps } from '@/queries/circuitDetail'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { browserTimeZone, formatDate } from '@/utils/dates'
import { formatNumber } from '@/utils/numbers'

const CircuitMap = defineAsyncComponent(() => import('./CircuitMap.vue'))

/** Everything that depends on the selected variant (P4): map, GP table with winners, data and plan. */
const props = defineProps<{ circuit: Circuit; variant: CircuitVariant }>()
const { t } = useI18n()
const now = useNow(60_000)
const session = useSessionStore()
const community = useCommunityStore()

/** Personal data (winner) needs a session AND an active community. */
const personal = computed(
  () => session.isAuthenticated && session.user != null && community.activeId != null,
)
const tz = computed(() => session.user?.timeZone || browserTimeZone())

const gpsQ = useVariantGps(
  () => props.circuit.id,
  () => props.variant.id,
)
const sorted = computed(() => sortGpsDesc(gpsQ.data.value ?? []))
const limited = computed(() => gpsWithPoints(sorted.value, now.value, Infinity))
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
        </div>
      </PCard>
    </div>

    <div
      class="contents min-[901px]:flex min-[901px]:min-w-0 min-[901px]:flex-col min-[901px]:gap-6"
    >
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
