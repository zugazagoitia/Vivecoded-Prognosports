<script setup lang="ts">
import '@/styles/ranking.css'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import RankNav from '@/components/layout/RankNav.vue'
import { findView, type SeasonOption } from '@/components/layout/rankNav'
import { useRankNav } from '@/components/layout/useRankNav'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { toaster } from '@/composables/useToast'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileTitle } from '@/composables/useMobileNav'
import { isEnabled } from '@/flags'
import { useRanking } from '@/queries/ranking'
import RankTotalsOnly from './RankTotalsOnly.vue'
import { EMPTY_OK, screenComponent } from './screens'

/**
 * Shell of every ranking screen (R0-R13): loads the shared model once, draws RankNav (N3) and
 * mounts the lazy screen of the open `:seccion/:vista`. Unknown view, flag off, unknown
 * community or season and «not a member» are handled here, so screens only draw data.
 */
const props = defineProps<{ seccion?: string; vista?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const mobile = useMediaQuery(MOBILE_QUERY)
const nav = useRankNav()

const communityId = computed(() => String((route.params as Record<string, string>).comunidad))
const seasonParam = computed(() => String((route.params as Record<string, string>).temporada))
const rk = useRanking(communityId, seasonParam)

const seccion = computed(() => props.seccion ?? 'resumen')
const found = computed(() => findView(seccion.value, props.vista))
const flagOn = computed(() => !found.value?.view.flag || isEnabled(found.value.view.flag))
const code = computed(() => (flagOn.value ? found.value?.view.screen : undefined))
const Screen = computed(() => screenComponent(code.value))

useMobileTitle(() => t('ranking.title'))

const numeric = (v: string | number) => (/^\d+$/.test(String(v)) ? Number(v) : v)
const communities = computed(() => {
  const list = (rk.communities.data.value ?? []).map((c) => ({ id: c.id, name: c.name }))
  const d = rk.detail.data.value
  if (d && !list.some((c) => String(c.id) === communityId.value)) {
    list.push({ id: Number(communityId.value), name: d.name })
  }
  return list
})
const seasons = computed<SeasonOption[]>(() => {
  const all = [...(rk.seasons.data.value ?? [])]
  const newest = all[0]?.id
  return all.map((s) => ({ id: s.id, label: s.name ?? String(s.id), current: s.id === newest }))
})
const model = computed(() => rk.model.value)
const played = computed(() => model.value?.played.length ?? 0)
const competitionName = computed(
  () =>
    rk.detail.data.value?.competition?.name ?? rk.detail.data.value?.competition?.fullname ?? '',
)
const hideNav = computed(() => mobile.value && code.value === 'R1')

const empty = computed(
  () => model.value != null && played.value === 0 && !EMPTY_OK.has(code.value ?? ''),
)

const hasTotals = computed(() => Object.keys(rk.totals.data.value ?? {}).length > 0)

watch(
  () => rk.notMember.value,
  (denied) => {
    if (!denied) return
    toaster.info(t('community.notMember'))
    void router.replace('/comunidades')
  },
  { immediate: true },
)
</script>

<template>
  <div class="pg-main flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <section
      v-if="rk.notFound.value || !found || !flagOn"
      class="flex flex-col items-center gap-3 py-12 text-center"
    >
      <PTitle>{{ t('ranking.notFound.title') }}</PTitle>
      <p class="text-muted max-w-md">{{ t('ranking.notFound.text') }}</p>
      <PButton to="/comunidades" icon="users">{{ t('ranking.notFound.action') }}</PButton>
    </section>

    <template v-else>
      <RankNav
        v-if="!hideNav && rk.season.value && seasons.length"
        :communities="communities"
        :community-id="numeric(communityId)"
        :seasons="seasons"
        :season-id="rk.season.value.id"
        :competition="competitionName"
        :played="played"
        :total="rk.total.value"
        :seccion="seccion"
        :vista="props.vista"
        @update:community-id="nav.changeCommunity"
        @update:season-id="nav.changeSeason"
        @navigate="nav.navigate"
      />
      <header v-else-if="!hideNav" class="flex flex-col gap-1">
        <PTitle>{{ t('ranking.title') }}</PTitle>
        <div class="skel h-5 w-64 rounded" aria-hidden="true" />
      </header>
      <h1 v-else class="sr-only">{{ t('ranking.title') }}</h1>

      <ErrorState
        v-if="rk.error.value && !rk.notMember.value"
        :what="t('ranking.error')"
        :error="rk.error.value"
        @retry="rk.refetch()"
      />
      <div v-else-if="!model" class="flex flex-col gap-4">
        <Skeleton variant="table" :rows="10" />
      </div>
      <RankTotalsOnly v-else-if="empty && hasTotals" :totals="rk.totals.data.value!" />
      <section v-else-if="empty" class="bg-surface ring-card-ring rounded-lg p-5 ring-1">
        <EmptyState
          icon="schedule"
          :title="t('ranking.empty.title')"
          :text="t('ranking.empty.text')"
        />
      </section>
      <component :is="Screen" v-else-if="Screen" :rk="rk" />
    </template>
  </div>
</template>
