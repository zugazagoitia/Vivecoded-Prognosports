<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import GpBand from '@/components/gps/GpBand.vue'
import GpCard, { type GpStatus } from '@/components/gps/GpCard.vue'
import { EmptyState, ErrorState, LoadingRegion, useSlowLoading } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import Chip from '@/components/ui/Chip.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useNow } from '@/composables/useNow'
import {
  chipCounts,
  filterFromParam,
  filterGps,
  FILTER_PARAM,
  GP_FILTERS,
  groupByMonth,
  gpRankForUser,
  isGpPlayed,
  isValidTimeZone,
  predictionDots,
  closeTime,
  sortSessions,
  type GpFilter,
} from '@/lib/gps'
import { DEFAULT_COMPETITION, useCurrentSeason, useSeasonGps } from '@/queries/circuits'
import { useCompetitionSeasons, useGpTippStatus, useNextGp } from '@/queries/gps'
import { useCommunityPoints } from '@/queries/resources'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: { layout: 'app', title: 'route.gps', guards: ['auth', 'verified', 'community'] },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const community = useCommunityStore()

const now = useNow(60_000)
const tz = computed(() =>
  isValidTimeZone(session.user?.timeZone) ? session.user.timeZone : undefined,
)

const competition = computed(() => community.active?.competition?.id ?? DEFAULT_COMPETITION)
const competitionName = computed(
  () => community.active?.competition?.fullname ?? community.active?.competition?.name,
)

const one = (v: unknown): string => {
  const x: unknown = Array.isArray(v) ? (v[0] as unknown) : v
  return typeof x === 'string' ? x : ''
}
const q = computed(() => one(route.query.q))
const filter = computed<GpFilter>(() => filterFromParam(one(route.query.f)))
const seasonParam = computed(() => Math.trunc(Number(one(route.query.temporada))) || undefined)

// Seasons: the selector (needs a session) and the current one (default).
const currentSeason = useCurrentSeason(competition)
const seasons = useCompetitionSeasons(competition)
const seasonOptions = computed(
  () => seasons.data.value ?? (currentSeason.data.value ? [currentSeason.data.value] : []),
)
const seasonId = computed(() => {
  const wanted = seasonParam.value
  if (wanted != null && (!seasons.data.value || seasons.data.value.some((s) => s.id === wanted))) {
    return wanted
  }
  return currentSeason.data.value?.id
})
const season = computed(() => seasonOptions.value.find((s) => s.id === seasonId.value))

const gps = useSeasonGps(competition, seasonId)
const points = useCommunityPoints(competition, seasonId)
const next = useNextGp(competition)

const isLoading = computed(
  () =>
    currentSeason.isLoading.value ||
    gps.isLoading.value ||
    (seasonId.value == null && !currentSeason.isError.value),
)
const error = computed(() =>
  seasonId.value == null ? currentSeason.error.value : (gps.error.value ?? null),
)
const slow = useSlowLoading({ isLoading })
function refetch() {
  if (currentSeason.isError.value) void currentSeason.refetch()
  if (gps.isError.value) void gps.refetch()
}

const list = computed(() => (gps.data.value ? [...gps.data.value] : []))
const counts = computed(() => chipCounts(list.value, now.value))
const filtered = computed(() => filterGps(list.value, filter.value, q.value, now.value))
const groups = computed(() => groupByMonth(filtered.value, tz.value))
const loaded = computed(() => gps.data.value != null && !error.value)

// GP in progress: the API's «next» GP when it belongs to the selected season and is not over.
const currentGp = computed(() => {
  const id = next.data.value?.id
  const gp = id != null ? list.value.find((g) => g.id === id) : undefined
  return gp && !gp.suspended && !isGpPlayed(gp, now.value) ? gp : undefined
})
const tipps = useGpTippStatus(
  competition,
  seasonId,
  () => currentGp.value?.id,
  () => sortSessions(currentGp.value?.sessions),
)
const currentDots = computed(() =>
  tipps.ready.value
    ? predictionDots(
        sortSessions(currentGp.value?.sessions).map((s) => ({
          done: tipps.done.value[s.id] === true,
          open: closeTime(s) > now.value,
        })),
      )
    : null,
)

function status(gp: (typeof list.value)[number]): GpStatus {
  if (gp.suspended) return 'suspended'
  if (isGpPlayed(gp, now.value)) return 'played'
  return gp.id === currentGp.value?.id ? 'current' : 'upcoming'
}
const userId = computed(() => session.user?.id)
const scoreOf = (id: number) => gpRankForUser(points.data.value?.[String(id)], userId.value)

const playedCount = computed(() => counts.value.played)
const subtitle = computed(() => {
  const params = {
    competition: competitionName.value,
    season: season.value?.name ?? '',
    played: playedCount.value,
    total: list.value.length,
  }
  return competitionName.value ? t('gps.subtitle', params) : t('gps.subtitleNoCompetition', params)
})

// URL state: season, filter and search (shareable; back keeps them).
const text = ref(q.value)
watch(q, (v) => {
  if (v !== text.value.trim()) text.value = v
})
function update(next: { q?: string; f?: GpFilter; temporada?: number | undefined }) {
  const merged = {
    q: q.value,
    f: filter.value,
    temporada: seasonParam.value,
    ...next,
  }
  const query: Record<string, string> = {}
  if (merged.temporada != null) query.temporada = String(merged.temporada)
  if (merged.f !== 'all') query.f = FILTER_PARAM[merged.f]
  if (merged.q) query.q = merged.q
  void router.replace({ query })
}
const pushQuery = useDebounceFn((v: string) => update({ q: v.trim() }), 200)
watch(text, (v) => {
  if (v.trim() !== q.value) void pushQuery(v)
})
const seasonModel = computed({
  get: () => seasonId.value ?? '',
  set: (v: string | number) => update({ temporada: Number(v) || undefined }),
})
function clearFilters() {
  text.value = ''
  update({ q: '', f: 'all' })
}
const filterLabels = computed(() =>
  Object.fromEntries(GP_FILTERS.map((f) => [f, t(`gps.filter.${f}`)])),
)
</script>

<template>
  <div class="pg-main flex flex-col gap-6">
    <Breadcrumb :items="[{ label: t('gps.home'), to: '/home' }, { label: t('gps.title') }]" />

    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-0.5">
        <PTitle>{{ t('gps.title') }}</PTitle>
        <div v-if="isLoading" class="skel skel-line max-w-xl" aria-hidden="true" />
        <p v-else-if="loaded" class="text-muted">{{ subtitle }}</p>
      </div>
      <PSelect
        v-model="seasonModel"
        :label="t('gps.season')"
        :options="seasonOptions.map((s) => ({ value: s.id, label: s.name ?? String(s.id) }))"
        :disabled="seasonOptions.length === 0"
        class="w-auto"
      />
    </header>

    <ErrorState v-if="error" :what="t('gps.error')" :error="error" @retry="refetch()" />
    <LoadingRegion v-else-if="isLoading" :loading="true" :slow="slow" @retry="refetch()">
      <template #skeleton>
        <div class="flex flex-col gap-6" aria-hidden="true">
          <div class="skel skel-band" />
          <div v-for="g in 2" :key="g" class="grid4 gps-grid">
            <div v-for="n in 4" :key="n" class="skel skel-gp" />
          </div>
        </div>
      </template>
    </LoadingRegion>

    <template v-else>
      <GpBand
        v-if="currentGp && seasonId != null"
        :gp="currentGp"
        :competition="competition"
        :season="seasonId"
        :done="tipps.done.value"
        :ready="tipps.ready.value"
      />

      <PCard>
        <div class="flex flex-wrap items-center gap-4">
          <div class="min-w-60 flex-1">
            <PInput
              v-model="text"
              type="search"
              icon="magnifying-glass"
              :aria-label="t('gps.search')"
              :placeholder="t('gps.searchPlaceholder')"
              :disabled="list.length === 0 && !q"
            />
          </div>
          <div class="flex flex-wrap gap-2" role="group" :aria-label="t('gps.filters')">
            <Chip
              v-for="f in GP_FILTERS"
              :key="f"
              :model-value="filter === f"
              @update:model-value="update({ f })"
            >
              {{ filterLabels[f] }}
              <span class="text-muted tabular-nums">{{ counts[f] }}</span>
            </Chip>
          </div>
        </div>
      </PCard>

      <p v-if="points.isError.value" class="text-muted flex flex-wrap items-center gap-2 text-sm">
        {{ t('gps.pointsError') }}
        <PButton variant="outline" size="sm" @click="points.refetch()">{{
          t('gps.retry')
        }}</PButton>
      </p>

      <PCard v-if="list.length === 0">
        <EmptyState
          icon="flag"
          :title="t('gps.empty.season.title')"
          :text="t('gps.empty.season.text')"
        />
      </PCard>
      <PCard v-else-if="groups.length === 0">
        <EmptyState
          variant="noResults"
          :title="q ? t('gps.empty.noResults', { q }) : t('gps.empty.noResultsFilter')"
        >
          <PButton variant="outline" size="sm" @click="clearFilters">{{
            t('gps.empty.clear')
          }}</PButton>
        </EmptyState>
      </PCard>
      <template v-else>
        <section v-for="g in groups" :key="g.key" class="flex flex-col gap-3">
          <h2
            class="text-muted flex items-center gap-3 text-[13px] leading-5 font-semibold tracking-wider uppercase after:h-px after:flex-1 after:bg-(--color-border) after:content-['']"
          >
            {{ g.label ?? t('gps.monthNoDate') }}
          </h2>
          <ul class="grid4 gps-grid" :aria-label="g.label ?? t('gps.monthNoDate')">
            <li v-for="gp in g.items" :key="gp.id" class="flex min-w-0">
              <GpCard
                :gp="gp"
                :competition="competition"
                :season="seasonId!"
                :status="status(gp)"
                :tz="tz"
                :score="points.isError.value ? null : scoreOf(gp.id)"
                :dots="gp.id === currentGp?.id ? currentDots : null"
              />
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<style>
.gps-grid {
  gap: 12px;
}
.skel-band {
  height: 92px;
  border-radius: 0.5rem;
}
.skel-gp {
  height: 120px;
  border-radius: 0.5rem;
}
</style>
