<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  EmptyState,
  ErrorState,
  LoadingRegion,
  Skeleton,
  useSlowLoading,
} from '@/components/states'
import AppImage from '@/components/ui/AppImage.vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import Chip from '@/components/ui/Chip.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PInput from '@/components/ui/PInput.vue'
import PPagination from '@/components/ui/PPagination.vue'
import PTag from '@/components/ui/PTag.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { focusRing } from '@/components/ui/styles'
import { useNow } from '@/composables/useNow'
import {
  CIRCUITS_PAGE_SIZE,
  filterCircuits,
  pageCount,
  pageInfo,
  type CircuitFilter,
} from '@/lib/circuits'
import { useSeasonCircuitRows } from '@/queries/circuits'
import { useSessionStore } from '@/stores/session'

definePage({ meta: { layout: 'app', title: 'route.circuits' } })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const now = useNow(60_000)
const { season, rows, isLoading, error, refetch } = useSeasonCircuitRows(now)
const slow = useSlowLoading({ isLoading })

const one = (v: unknown): string => {
  const x: unknown = Array.isArray(v) ? (v[0] as unknown) : v
  return typeof x === 'string' ? x : ''
}
const q = computed(() => one(route.query.q))
const filter = computed<CircuitFilter>(() => {
  const f = Number(one(route.query.filtro))
  return f === 1 || f === 2 ? f : 0
})
const rawPage = computed(() => Math.max(1, Math.trunc(Number(one(route.query.page))) || 1))

/** Search box text; the URL follows after a short pause (back keeps search, filter and page). */
const text = ref(q.value)
watch(q, (v) => {
  if (v !== text.value.trim()) text.value = v
})

function update(next: { q?: string; filtro?: CircuitFilter; page?: number }) {
  const merged = { q: q.value, filtro: filter.value, page: rawPage.value, ...next }
  const query: Record<string, string> = {}
  if (merged.q) query.q = merged.q
  if (merged.filtro) query.filtro = String(merged.filtro)
  if (merged.page > 1) query.page = String(merged.page)
  void router.replace({ query })
}
const pushQuery = useDebounceFn((v: string) => update({ q: v.trim(), page: 1 }), 200)
watch(text, (v) => {
  if (v.trim() !== q.value) void pushQuery(v)
})

function toggle(f: 1 | 2, on: boolean) {
  update({ filtro: on ? f : 0, page: 1 })
}

const filtered = computed(() => filterCircuits(rows.value ?? [], q.value, filter.value))
const total = computed(() => filtered.value.length)
const pages = computed(() => pageCount(total.value))
const page = computed({
  get: () => Math.min(rawPage.value, pages.value),
  set: (p: number) => update({ page: p }),
})
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * CIRCUITS_PAGE_SIZE, page.value * CIRCUITS_PAGE_SIZE),
)
const info = computed(() => pageInfo(total.value, page.value))
const year = computed(() => season.value?.name ?? '')
const homeTo = computed(() => (session.isAuthenticated ? '/home' : '/'))
const loaded = computed(() => rows.value != null && !error.value)
</script>

<template>
  <div class="pg-main flex flex-col gap-6">
    <Breadcrumb
      :items="[{ label: t('circuits.home'), to: homeTo }, { label: t('circuits.title') }]"
    />

    <header class="flex flex-col gap-0.5">
      <PTitle>{{ t('circuits.title') }}</PTitle>
      <Skeleton v-if="isLoading" variant="line" class="max-w-xl" />
      <p v-else-if="rows" class="text-muted">
        {{ t('circuits.subtitle', { n: rows.length, year }, rows.length) }}
      </p>
    </header>

    <PCard>
      <div class="flex flex-wrap items-center gap-4">
        <div class="min-w-60 flex-1">
          <PInput
            v-model="text"
            type="search"
            icon="magnifying-glass"
            :aria-label="t('circuits.search')"
            :placeholder="t('circuits.searchPlaceholder')"
            :disabled="!loaded"
          />
        </div>
        <div class="flex flex-wrap gap-2" role="group" :aria-label="t('circuits.filters')">
          <Chip
            :model-value="filter === 0"
            :disabled="!loaded"
            @update:model-value="update({ filtro: 0, page: 1 })"
          >
            {{ t('circuits.filter.all') }}
          </Chip>
          <Chip
            :model-value="filter === 1"
            :disabled="!loaded"
            @update:model-value="toggle(1, $event)"
          >
            {{ t('circuits.filter.played', { year }) }}
          </Chip>
          <Chip
            :model-value="filter === 2"
            :disabled="!loaded"
            @update:model-value="toggle(2, $event)"
          >
            {{ t('circuits.filter.sprint') }}
          </Chip>
        </div>
      </div>
    </PCard>

    <ErrorState v-if="error" :what="t('circuits.error')" :error="error" @retry="refetch()" />
    <LoadingRegion v-else-if="isLoading" :loading="true" :slow="slow" @retry="refetch()">
      <template #skeleton>
        <div class="grid4" aria-hidden="true">
          <div v-for="n in CIRCUITS_PAGE_SIZE" :key="n" class="skel skel-circuit" />
        </div>
      </template>
    </LoadingRegion>
    <PCard v-else-if="rows && rows.length === 0">
      <EmptyState
        icon="route"
        :title="t('circuits.emptySeason.title')"
        :text="t('circuits.emptySeason.text')"
      />
    </PCard>
    <PCard v-else-if="total === 0">
      <EmptyState
        variant="noResults"
        :title="t('circuits.noResults.title')"
        :text="t('circuits.noResults.text')"
      />
    </PCard>
    <template v-else>
      <ul class="grid4" :aria-label="t('circuits.list')">
        <li v-for="r in visible" :key="r.circuit.id" class="flex min-w-0">
          <RouterLink
            :to="`/circuits/${r.circuit.id}`"
            :class="[
              'bg-surface ring-card-ring flex w-full flex-col overflow-hidden rounded-lg no-underline shadow-(--card-shadow) ring-1 hover:shadow-[var(--card-shadow),0_0_0_2px_var(--color-focus-ring)]',
              focusRing,
            ]"
          >
            <span
              class="circuit-layout border-border bg-surface-muted text-focus-ring flex h-[132px] items-center justify-center border-b"
              aria-hidden="true"
            >
              <AppImage
                v-if="r.layoutUrl"
                :src="r.layoutUrl"
                alt=""
                :width="148"
                :height="104"
                class="h-[104px] w-full object-contain px-4"
              />
              <PIcon v-else name="route" :size="24" />
            </span>
            <span class="flex flex-col gap-1 px-4 py-3.5">
              <span class="text-heading font-bold">{{ r.circuit.name }}</span>
              <span class="text-muted text-sm">
                {{ [r.circuit.locality, r.circuit.country].filter(Boolean).join(' · ') }}
              </span>
              <span class="mt-1 flex flex-wrap gap-2">
                <PTag v-if="r.round != null" color="gray">
                  {{ t('circuits.round', { n: r.round }) }}
                </PTag>
                <PTag v-if="r.sprint" color="info">{{ t('circuits.sprint') }}</PTag>
                <PTag v-if="r.done" color="ok">{{ t('circuits.played') }}</PTag>
              </span>
            </span>
          </RouterLink>
        </li>
      </ul>

      <div aria-live="polite">
        <PPagination
          v-if="pages > 1"
          v-model="page"
          :total="total"
          :per-page="CIRCUITS_PAGE_SIZE"
        />
        <p v-else class="text-muted text-sm">
          {{ t('showing', { from: info.from, to: info.to, total: info.total }) }}
        </p>
      </div>
    </template>
  </div>
</template>

<style>
.skel-circuit {
  height: 15rem;
  border-radius: 0.5rem;
}
:root[data-theme='dark'] .circuit-layout {
  background: var(--color-white);
}
</style>
