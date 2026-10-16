<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BreakdownView from '@/components/results/BreakdownView.vue'
import ResultsBanner from '@/components/results/ResultsBanner.vue'
import ResultsLegend from '@/components/results/ResultsLegend.vue'
import ResultsTable from '@/components/results/ResultsTable.vue'
import { useResults } from '@/components/results/useResults'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PTitle from '@/components/ui/PTitle.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileTitle } from '@/composables/useMobileNav'
import { gpPath, sessionLabel, sessionPath } from '@/lib/gp'
import { legendFor } from '@/lib/results'
import { useCommunityStore } from '@/stores/community'

definePage({
  meta: {
    layout: 'app',
    title: 'route.results',
    guards: ['auth', 'verified', 'community'],
    backHref: '/gps',
  },
})

type View = 'comunidad' | 'desglose'

const { t } = useI18n()
const route = useRoute('/gps/[competicion]/[temporada]/[gp]/resultados/[sesion]')
const router = useRouter()
const mobile = useMediaQuery(MOBILE_QUERY)
const p = (name: 'competicion' | 'temporada' | 'gp' | 'sesion') => String(route.params[name] ?? '')

const r = useResults(
  () => p('competicion'),
  () => p('temporada'),
  () => p('gp'),
  () => p('sesion'),
)
const { gp, session } = r

useMobileTitle(() => t('results.mobileTitle'))

const sessionName = computed(() => (session.value ? sessionLabel(session.value).long : ''))
const communityStore = useCommunityStore()
const community = computed(() => communityStore.active?.name ?? '')

/** «Tu desglose» only exists with results: any other moment shows the community table. */
const wanted = computed<View>(() => (route.query.vista === 'desglose' ? 'desglose' : 'comunidad'))
const view = computed<View>(() =>
  wanted.value === 'desglose' && r.moment.value === 'res' ? 'desglose' : 'comunidad',
)
const viewModel = computed({
  get: () => view.value,
  set: (v: View) =>
    void router.replace({ query: { ...route.query, vista: v === 'desglose' ? v : undefined } }),
})
const viewOptions = computed(() => {
  const o = [{ value: 'comunidad' as View, label: t('results.views.community') }]
  if (r.moment.value === 'res') {
    o.push({ value: 'desglose', label: t('results.views.breakdown') })
  }
  return o
})

const sessionOptions = computed(() =>
  r.sessions.value.map((s) => ({ value: String(s.id), label: sessionLabel(s).short })),
)
const sessionModel = computed({
  get: () => p('sesion'),
  set: (v: string) => {
    const target = r.sessions.value.find((s) => String(s.id) === v)
    if (gp.value && target) {
      void router.push({ path: sessionPath(gp.value, 'resultados', target), query: route.query })
    }
  },
})

const legend = computed(() => (r.moment.value ? legendFor(r.moment.value, r.rules.value) : []))
const caption = computed(() => t('results.caption', { session: sessionName.value }))
const playersWithPick = computed(() => r.rows.value.filter((x) => x.hasPick).length)
const gpHref = computed(() => (gp.value ? gpPath(gp.value) : '/gps'))
const crumbs = computed(() => [
  { label: t('gp.home'), to: '/home' },
  { label: t('gp.list'), to: '/gps' },
  { label: r.shortName.value || t('loading'), to: gp.value ? gpHref.value : undefined },
  { label: t('results.crumb') },
])
</script>

<template>
  <div class="pg-main flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <!-- Unknown GP or session -->
    <template v-if="r.detail.notFound.value || r.sessionNotFound.value">
      <section class="flex flex-col items-center gap-3 py-12 text-center">
        <PTitle>{{
          r.detail.notFound.value
            ? t('results.notFound.gpTitle')
            : t('results.notFound.sessionTitle')
        }}</PTitle>
        <p class="text-muted max-w-md">
          {{
            r.detail.notFound.value
              ? t('results.notFound.gpText')
              : t('results.notFound.sessionText')
          }}
        </p>
        <PButton :to="r.detail.notFound.value ? '/gps' : gpHref" icon="flag">{{
          t('results.notFound.action')
        }}</PButton>
      </section>
    </template>

    <template v-else>
      <Breadcrumb v-if="!mobile" :items="crumbs" />

      <ErrorState
        v-if="r.detail.isError.value"
        :what="t('results.error.gp')"
        :error="r.detail.error.value"
        @retry="r.detail.refetch()"
      />
      <div v-else-if="!gp || !session" class="flex flex-col gap-6">
        <h1 class="sr-only">{{ t('loading') }}</h1>
        <Skeleton variant="line" :lines="2" class="max-w-xl" />
        <Skeleton variant="table" :rows="12" />
      </div>

      <template v-else>
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div class="flex min-w-0 flex-col gap-1">
            <PTitle>{{ t('results.title', { session: sessionName }) }}</PTitle>
            <p class="text-muted">
              {{
                t('results.subtitle', {
                  gp: r.shortName.value,
                  round: gp.round ?? '',
                  community,
                })
              }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <SegmentedControl
              v-model="sessionModel"
              :options="sessionOptions"
              :label="t('results.session')"
            />
            <SegmentedControl
              v-model="viewModel"
              :options="viewOptions"
              :label="t('results.view')"
            />
          </div>
        </header>

        <ErrorState
          v-if="r.error.value"
          :what="t('results.error.data')"
          :error="r.error.value"
          @retry="r.refetch()"
        />
        <PCard v-else-if="r.loading.value" :padded="true">
          <Skeleton variant="table" :rows="12" />
        </PCard>

        <template v-else-if="r.moment.value">
          <BreakdownView
            v-if="view === 'desglose'"
            :rows="r.breakdown.value"
            :me="r.myRow.value"
            :players="playersWithPick"
            :positions="r.positions.value"
            :near="r.near.value"
            :rules="r.rules.value"
            :bonus="r.bonus.value"
            :caption="t('results.breakdown.caption', { session: sessionName })"
          />

          <PCard v-else tag="section" :padded="false">
            <template #header>
              <div class="flex flex-col gap-0.5">
                <PTitle level="header" as="h2">{{ t('results.community.title') }}</PTitle>
                <p class="text-muted text-[13px]">{{ t('results.community.text') }}</p>
              </div>
            </template>
            <div v-if="r.banner.value" class="px-5 pt-4">
              <ResultsBanner :banner="r.banner.value" />
            </div>
            <EmptyState
              v-if="!r.positions.value"
              icon="groups"
              :title="t('results.empty.title')"
              :text="t('results.empty.text')"
            />
            <div v-else class="pt-4">
              <ResultsTable
                :rows="r.rows.value"
                :positions="r.positions.value"
                :moment="r.moment.value"
                :results="r.classifiedResults.value"
                :caption="caption"
              />
            </div>
            <template #footer>
              <div class="mr-auto">
                <ResultsLegend :items="legend" />
              </div>
            </template>
          </PCard>
        </template>
      </template>
    </template>
  </div>
</template>
