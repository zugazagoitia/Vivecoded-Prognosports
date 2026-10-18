<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api'
import CircuitVariantView from '@/components/circuits/CircuitVariantView.vue'
import { ErrorState, Skeleton } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PTabs from '@/components/ui/PTabs.vue'
import PTag from '@/components/ui/PTag.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { isSprintWeekend } from '@/lib/circuits'
import { pickVariant } from '@/lib/circuitDetail'
import { useCircuit } from '@/queries/circuitDetail'
import { DEFAULT_COMPETITION, useCurrentSeason, useSeasonGps } from '@/queries/circuits'
import { useSessionStore } from '@/stores/session'

// Lazy: the flag SVGs stay out of the eager bundle (issue 223).
const CountryFlag = defineAsyncComponent(() => import('@/components/common/CountryFlag.vue'))

definePage({ meta: { layout: 'app', title: 'route.circuit' } })

const { t } = useI18n()
const route = useRoute('/circuits/[id]')
const router = useRouter()
const session = useSessionStore()

const id = computed(() => String(route.params.id))
const circuitQ = useCircuit(id)
const circuit = computed(() => circuitQ.data.value)

/** Unknown ids answer 200 with `success:false` (or 404): any non-auth client-side failure. */
const notFound = computed(() => {
  const e = circuitQ.error.value
  return (
    e instanceof ApiError && e.kind === 'http' && e.status < 500 && ![401, 403].includes(e.status)
  )
})

const variants = computed(() => circuit.value?.variants ?? [])
const wanted = computed(() => {
  const v: unknown = route.query.variant
  const x: unknown = Array.isArray(v) ? (v[0] as unknown) : v
  return typeof x === 'string' ? x : undefined
})
const variant = computed(() => pickVariant(variants.value, wanted.value))
const tabs = computed(() =>
  variants.value.map((v) => ({ value: String(v.id), label: v.name ?? '' })),
)
const selected = computed({
  get: () => (variant.value ? String(variant.value.id) : ''),
  set: (v: string) => void router.replace({ query: { ...route.query, variant: v } }),
})

// GP of the current season at this circuit (header tag and button).
const season = useCurrentSeason()
const seasonGps = useSeasonGps(DEFAULT_COMPETITION, () => season.data.value?.id)
const seasonGp = computed(() =>
  seasonGps.data.value?.find((g) => g.circuit?.id === circuit.value?.id),
)
const seasonGpTo = computed(() =>
  seasonGp.value
    ? `/gps/${seasonGp.value.competition?.id ?? 1}/${seasonGp.value.season?.id ?? ''}/${seasonGp.value.id}`
    : undefined,
)
const sprint = computed(() => (seasonGp.value ? isSprintWeekend(seasonGp.value) : false))
const homeTo = computed(() => (session.isAuthenticated ? '/home' : '/'))
</script>

<template>
  <div class="pg-main flex flex-col gap-6">
    <template v-if="notFound">
      <Breadcrumb
        :items="[
          { label: t('circuits.home'), to: homeTo },
          { label: t('circuits.title'), to: '/circuits' },
          { label: t('circuits.detail.notFound.title') },
        ]"
      />
      <section class="flex flex-col items-center gap-3 py-12 text-center">
        <PTitle>{{ t('circuits.detail.notFound.title') }}</PTitle>
        <p class="text-muted max-w-md">{{ t('circuits.detail.notFound.text') }}</p>
        <PButton to="/circuits" icon="route">{{ t('circuits.detail.notFound.action') }}</PButton>
      </section>
    </template>

    <template v-else>
      <Breadcrumb
        :items="[
          { label: t('circuits.home'), to: homeTo },
          { label: t('circuits.title'), to: '/circuits' },
          { label: circuit?.name ?? t('loading') },
        ]"
      />

      <ErrorState
        v-if="circuitQ.isError.value"
        :what="t('circuits.detail.error')"
        :error="circuitQ.error.value"
        @retry="circuitQ.refetch()"
      />
      <div v-else-if="!circuit" class="flex flex-col gap-6">
        <h1 class="sr-only">{{ t('loading') }}</h1>
        <Skeleton variant="line" :lines="2" class="max-w-xl" />
        <div class="skel h-[340px] rounded-lg" aria-hidden="true" />
      </div>

      <template v-else>
        <header class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex min-w-0 flex-col gap-0.5">
            <PTitle>{{ circuit.name }}</PTitle>
            <p class="text-muted flex min-w-0 items-center gap-2">
              <CountryFlag v-if="circuit.country" :country="circuit.country" />
              <span>{{
                t('circuits.detail.subtitle', {
                  locality: circuit.locality ?? '',
                  country: circuit.country ?? '',
                })
              }}</span>
            </p>
          </div>
          <div v-if="seasonGp" class="flex flex-wrap items-center gap-2">
            <PTag v-if="sprint" color="info">
              {{
                t('circuits.detail.sprintIn', {
                  year: seasonGp.season?.name ?? season.data.value?.name,
                })
              }}
            </PTag>
            <PButton v-if="seasonGpTo" :to="seasonGpTo">
              {{ t('circuits.detail.viewGp', { country: circuit.country }) }}
            </PButton>
          </div>
        </header>

        <PTabs
          v-if="variants.length > 1"
          v-model="selected"
          :tabs="tabs"
          :label="t('circuits.detail.variants')"
        >
          <template v-for="tab in tabs" :key="tab.value" #[tab.value]>
            <CircuitVariantView v-if="variant" :circuit="circuit" :variant="variant" />
          </template>
        </PTabs>
        <CircuitVariantView v-else-if="variant" :circuit="circuit" :variant="variant" />
      </template>
    </template>
  </div>
</template>
