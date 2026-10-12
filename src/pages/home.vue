<script setup lang="ts">
import { computed, defineAsyncComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'
import CommandCard from '@/components/home/CommandCard.vue'
import CommunitySwitch from '@/components/home/CommunitySwitch.vue'
import DiffArea from '@/components/home/DiffArea.vue'
import KpiCard from '@/components/home/KpiCard.vue'
import MobileNext from '@/components/home/MobileNext.vue'
import MobileSessions from '@/components/home/MobileSessions.vue'
import NearCard from '@/components/home/NearCard.vue'
import { createHome, provideHome } from '@/components/home/useHome'
import { Skeleton } from '@/components/states'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useFlag } from '@/flags'
import { longToday } from '@/lib/home'

definePage({
  meta: {
    layout: 'app',
    title: 'route.home',
    guards: ['auth', 'verified', 'community'],
  },
})

// Heavy or flagged blocks are separate chunks: the chart code and the optional cards are only
// downloaded when they are shown (a flag that is off never loads, renders or fetches them).
const EvolutionCard = defineAsyncComponent({
  loader: () => import('@/components/home/EvolutionCard.vue'),
  loadingComponent: () => h(Skeleton, { variant: 'chart' }),
  delay: 0,
})
const SeasonCard = defineAsyncComponent(() => import('@/components/home/SeasonCard.vue'))
const HonoursCard = defineAsyncComponent(() => import('@/components/home/HonoursCard.vue'))

const { t } = useI18n()
const mobile = useMediaQuery(MOBILE_QUERY)
const home = createHome()
provideHome(home)

const seasonOn = useFlag('MY_SEASON')
const honoursOn = useFlag('HONOURS')

const greeting = computed(() => t('home.greeting', { name: home.scope.user?.username ?? '' }))
const subtitle = computed(() => {
  const date = longToday(home.now, home.scope.tz)
  const competition = home.scope.competition?.fullname ?? home.scope.competition?.name ?? ''
  const season = home.scope.season?.name ?? ''
  const round = home.next.gp?.round
  const total = home.scope.season?.totalEvents
  return round && total
    ? t('home.subtitle', { date, competition, season, round, total })
    : t('home.subtitleNoRound', { date, competition, season })
})
</script>

<template>
  <div v-if="mobile" class="flex flex-col gap-4 px-4 pt-4 pb-6">
    <h1 class="sr-only">{{ greeting }}</h1>
    <CommunitySwitch
      chips
      :communities="home.scope.communities"
      :active-id="home.scope.activeId"
      @select="home.scope.select"
    />
    <MobileNext />
    <MobileSessions />
    <KpiCard compact />
    <DiffArea />
    <NearCard compact />
  </div>

  <div v-else class="pg-main flex flex-col gap-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h1 class="text-heading m-0 text-[28px] leading-9 font-bold max-[640px]:text-2xl">
          {{ greeting }}
        </h1>
        <p class="text-muted m-0">{{ subtitle }}</p>
      </div>
      <CommunitySwitch
        :communities="home.scope.communities"
        :active-id="home.scope.activeId"
        @select="home.scope.select"
      />
    </header>

    <div class="grid items-start gap-6 min-[901px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <CommandCard />
      <aside class="flex min-w-0 flex-col gap-4">
        <KpiCard />
        <NearCard />
      </aside>
    </div>

    <EvolutionCard />

    <div
      v-if="seasonOn || honoursOn"
      class="grid items-stretch gap-6 min-[901px]:grid-cols-3 sm:grid-cols-2"
    >
      <SeasonCard v-if="seasonOn" />
      <HonoursCard v-if="honoursOn" />
    </div>
  </div>
</template>
