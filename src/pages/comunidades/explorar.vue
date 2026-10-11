<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import type { Community } from '@/api/schemas'
import CommunityMark from '@/components/communities/CommunityMark.vue'
import { EmptyState, ErrorState, LoadingRegion, useSlowLoading } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PPagination from '@/components/ui/PPagination.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTabs from '@/components/ui/PTabs.vue'
import PTag from '@/components/ui/PTag.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useToast } from '@/composables/useToast'
import {
  EXPLORE_PAGE_SIZE,
  EXPLORE_SORTS,
  EXPLORE_TABS,
  filterCommunities,
  formatCreated,
  parseTab,
  rowAction,
  sortCommunities,
  tabCounts,
  type ExploreSort,
  type ExploreTab,
} from '@/lib/explore'
import { useExploreCommunities, useJoinCommunity } from '@/queries/communities'
import { keys } from '@/queries/keys'

definePage({
  meta: { layout: 'app', title: 'route.communitiesExplore', guards: ['auth', 'verified'] },
})

/**
 * Explorer of communities (H3). `GET /v2/communities` returns every community: tabs, search,
 * sort and paging are client side. The `invitation` code of a community is never shown; it is
 * only used to join an OPEN community with one click (`POST /v2/communities/{id}/{invitation}`).
 * Tab and search live in the URL (`?tab=abiertas&q=…`).
 */
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const qc = useQueryClient()

const q = useExploreCommunities()
const slow = useSlowLoading({ isLoading: q.isLoading })
const all = computed(() => q.data.value ?? [])

const first = (v: unknown): string => {
  const x: unknown = Array.isArray(v) ? v[0] : v
  return typeof x === 'string' ? x : ''
}
const tab = computed<ExploreTab>(() => parseTab(first(route.query.tab)))
const search = ref(first(route.query.q))
const sort = ref<ExploreSort>('jugadores')
const page = ref(1)

function setQuery(patch: { tab?: ExploreTab; q?: string }) {
  const query = { ...route.query }
  const nextTab = patch.tab ?? tab.value
  const nextQ = patch.q ?? search.value.trim()
  if (nextTab === 'todas') delete query.tab
  else query.tab = nextTab
  if (nextQ) query.q = nextQ
  else delete query.q
  void router.replace({ query })
}
const tabModel = computed({
  get: () => tab.value,
  set: (v: string) => {
    page.value = 1
    setQuery({ tab: parseTab(v) })
  },
})

// Live search with a debounce; it keeps the tab and goes back to page 1.
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => setQuery({ q: search.value.trim() }), 250)
})
onBeforeUnmount(() => clearTimeout(timer))
const needle = computed(() => first(route.query.q))
watch([needle, sort], () => (page.value = 1))

const counts = computed(() => tabCounts(all.value))
const tabs = computed(() =>
  EXPLORE_TABS.map((value) => ({
    value,
    label: t(`explore.tabs.${value}`),
    count: counts.value[value],
  })),
)
const sortOptions = EXPLORE_SORTS.map((value) => ({ value, label: t(`explore.sort.${value}`) }))

const filtered = computed(() =>
  sortCommunities(filterCommunities(all.value, tab.value, needle.value), sort.value),
)
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * EXPLORE_PAGE_SIZE, page.value * EXPLORE_PAGE_SIZE),
)

const join = useJoinCommunity()
const joiningId = ref<number | undefined>()
async function doJoin(c: Community) {
  if (joiningId.value != null) return
  joiningId.value = c.id
  try {
    // The code stays internal: open communities are joined with one click.
    await join.mutateAsync({ code: c.invitation ?? '', communityId: c.id })
    toast.success(t('explore.joined', { name: c.name }))
    void qc.invalidateQueries({ queryKey: keys.exploreCommunities() })
    await router.push(`/comunidades/${c.id}`)
  } catch {
    toast.error(t('explore.joinFailed', { name: c.name }))
  } finally {
    joiningId.value = undefined
  }
}
</script>

<template>
  <div class="pg-main flex flex-col gap-6">
    <Breadcrumb
      :items="[
        { label: t('explore.home'), to: '/home' },
        { label: t('explore.communities'), to: '/comunidades' },
        { label: t('explore.title') },
      ]"
    />

    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-0.5">
        <PTitle>{{ t('explore.title') }}</PTitle>
        <p class="text-muted">{{ t('explore.subtitle') }}</p>
      </div>
      <PButton icon="plus" to="/comunidades/crear">{{ t('explore.create') }}</PButton>
    </header>

    <ErrorState
      v-if="q.isError.value"
      :what="t('explore.what')"
      :error="q.error.value"
      @retry="q.refetch()"
    />
    <LoadingRegion v-else-if="q.isLoading.value" :loading="true" :slow="slow" @retry="q.refetch()">
      <template #skeleton>
        <div class="flex flex-col gap-2" aria-hidden="true">
          <div v-for="n in 8" :key="n" class="skel h-14 rounded-md" />
        </div>
      </template>
    </LoadingRegion>

    <PCard v-else :padded="false">
      <div class="px-3 pt-2 sm:px-5">
        <PTabs v-model="tabModel" :tabs="tabs" :label="t('explore.tabsLabel')">
          <template v-for="tb in tabs" :key="tb.value" #[tb.value]>
            <div class="-mx-3 -mt-4 min-w-0 sm:-mx-5">
              <div class="border-border flex flex-wrap items-end gap-4 border-b px-3 py-4 sm:px-5">
                <div class="min-w-60 flex-1">
                  <PInput
                    v-model="search"
                    type="search"
                    icon="magnifying-glass"
                    :aria-label="t('explore.searchLabel')"
                    :placeholder="t('explore.searchPlaceholder')"
                    autocomplete="off"
                  />
                </div>
                <PSelect v-model="sort" :label="t('explore.sortLabel')" :options="sortOptions" />
              </div>

              <div v-if="rows.length" class="relative overflow-x-auto">
                <table class="w-full border-collapse text-sm leading-5">
                  <caption class="sr-only">
                    {{
                      t('explore.table')
                    }}
                  </caption>
                  <thead>
                    <tr class="table-head bg-surface-muted text-muted">
                      <th scope="col" class="border-border border-b px-4 py-2.5 text-left">
                        {{ t('explore.cols.community') }}
                      </th>
                      <th scope="col" class="border-border border-b px-4 py-2.5 text-left">
                        {{ t('explore.cols.access') }}
                      </th>
                      <th scope="col" class="border-border border-b px-4 py-2.5 text-right">
                        {{ t('explore.cols.players') }}
                      </th>
                      <th scope="col" class="border-border border-b px-4 py-2.5 text-left">
                        {{ t('explore.cols.rules') }}
                      </th>
                      <th scope="col" class="border-border border-b px-4 py-2.5 text-left">
                        {{ t('explore.cols.created') }}
                      </th>
                      <th scope="col" class="border-border border-b px-4 py-2.5">
                        <span class="sr-only">{{ t('explore.cols.action') }}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="c in rows"
                      :key="c.id"
                      :class="['group', c.userIsMember ? 'me bg-tint' : 'hover:bg-surface-hover']"
                    >
                      <td class="border-border border-b px-4 py-2.5 group-last:border-b-0">
                        <div class="flex min-w-56 items-center gap-3">
                          <CommunityMark :community="c" :size="48" class="size-10! text-sm!" />
                          <div class="min-w-0">
                            <div class="text-heading font-bold">{{ c.name }}</div>
                            <div v-if="c.owner?.username" class="text-muted text-xs">
                              {{ t('explore.by', { owner: c.owner.username }) }}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        class="border-border border-b px-4 py-2.5 whitespace-nowrap group-last:border-b-0"
                      >
                        <PTag v-if="c.open" color="ok" icon="globe">{{ t('explore.open') }}</PTag>
                        <PTag v-else color="brand" icon="lock">{{ t('explore.closed') }}</PTag>
                      </td>
                      <td
                        class="border-border text-body border-b px-4 py-2.5 text-right tabular-nums group-last:border-b-0"
                      >
                        {{ c.membersAmount ?? 0 }}
                      </td>
                      <td
                        class="border-border text-body border-b px-4 py-2.5 whitespace-nowrap group-last:border-b-0"
                      >
                        {{ c.defaultRuleSet?.displayname ?? '' }}
                      </td>
                      <td
                        class="border-border text-body border-b px-4 py-2.5 whitespace-nowrap group-last:border-b-0"
                      >
                        {{ formatCreated(c.created) }}
                      </td>
                      <td
                        class="border-border border-b px-4 py-2.5 text-right whitespace-nowrap group-last:border-b-0"
                      >
                        <PButton
                          v-if="rowAction(c) === 'open'"
                          variant="soft"
                          size="sm"
                          :to="`/comunidades/${c.id}`"
                          :aria-label="t('explore.actions.openAria', { name: c.name })"
                          >{{ t('explore.actions.open') }}</PButton
                        >
                        <PButton
                          v-else-if="rowAction(c) === 'join'"
                          size="sm"
                          :loading="joiningId === c.id"
                          :disabled="joiningId != null"
                          :aria-label="t('explore.actions.joinAria', { name: c.name })"
                          @click="doJoin(c)"
                          >{{ t('explore.actions.join') }}</PButton
                        >
                        <PButton
                          v-else
                          variant="outline"
                          size="sm"
                          icon="key"
                          to="/comunidades"
                          :aria-label="t('explore.actions.codeAria', { name: c.name })"
                          >{{ t('explore.actions.code') }}</PButton
                        >
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <EmptyState
                v-else
                variant="noResults"
                :title="t('explore.empty.title')"
                :text="t('explore.empty.text')"
              />

              <div class="border-border border-t px-3 py-3 sm:px-5" aria-live="polite">
                <PPagination
                  v-model="page"
                  :total="filtered.length"
                  :per-page="EXPLORE_PAGE_SIZE"
                />
              </div>
            </div>
          </template>
        </PTabs>
      </div>
    </PCard>
  </div>
</template>
