<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Community } from '@/api/schemas'
import CommunityCard from '@/components/communities/CommunityCard.vue'
import JoinCommunityForm from '@/components/communities/JoinCommunityForm.vue'
import PercentileBlock from '@/components/communities/PercentileBlock.vue'
import { EmptyState, ErrorState, LoadingRegion, useSlowLoading } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useNow } from '@/composables/useNow'
import { useToast } from '@/composables/useToast'
import FeatureFlag from '@/flags/FeatureFlag.vue'
import {
  useActivateCommunity,
  useCommunityPending,
  useCommunityStandings,
  useMyCommunities,
} from '@/queries/communities'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: { layout: 'app', title: 'route.communities', guards: ['auth', 'verified'] },
})

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const session = useSessionStore()
const store = useCommunityStore()

const mine = useMyCommunities()
const list = computed(() => mine.data.value ?? [])
const now = useNow(60_000)
const standings = useCommunityStandings(list)
const pending = useCommunityPending(list, now)
const slow = useSlowLoading({ isLoading: mine.isLoading })

const activate = useActivateCommunity()
const announcement = ref('')
function makeActive(c: Community) {
  activate(c.id)
  announcement.value = t('communities.card.activated', { name: c.name })
  toast.success(announcement.value)
}
function joined(c: Community) {
  void router.push(`/comunidades/${c.id}`)
}
</script>

<template>
  <div class="pg-main flex flex-col gap-6">
    <Breadcrumb
      :items="[{ label: t('communities.home'), to: '/home' }, { label: t('communities.title') }]"
    />

    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-0.5">
        <PTitle>{{ t('communities.title') }}</PTitle>
        <p v-if="mine.isSuccess.value" class="text-muted">
          {{
            list.length
              ? t('communities.intro', {
                  count: t('communities.count', { n: list.length }, list.length),
                })
              : t('communities.introNone')
          }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <PButton variant="outline" icon="magnifying-glass" to="/comunidades/explorar">{{
          t('communities.explore')
        }}</PButton>
        <PButton icon="plus" to="/comunidades/crear">{{ t('communities.create') }}</PButton>
      </div>
    </header>

    <ErrorState
      v-if="mine.isError.value"
      :what="t('communities.error')"
      :error="mine.error.value"
      @retry="mine.refetch()"
    />
    <LoadingRegion
      v-else-if="mine.isLoading.value"
      :loading="true"
      :slow="slow"
      @retry="mine.refetch()"
    >
      <template #skeleton>
        <div class="flex flex-col gap-6" aria-hidden="true">
          <div class="skel h-64 rounded-lg" />
          <div class="grid2">
            <div v-for="n in 2" :key="n" class="skel h-60 rounded-lg" />
          </div>
        </div>
      </template>
    </LoadingRegion>

    <template v-else>
      <FeatureFlag v-if="list.length" name="COMMUNITY_PERCENTILE">
        <PercentileBlock :communities="list" />
      </FeatureFlag>

      <div class="split-r">
        <section class="flex min-w-0 flex-col gap-4" :aria-label="t('communities.list')">
          <h2 class="sr-only">{{ t('communities.list') }}</h2>
          <PCard v-if="list.length === 0">
            <EmptyState
              variant="noCommunity"
              :title="t('communities.empty.title')"
              :text="t('communities.empty.text')"
            />
          </PCard>
          <div class="grid2 items-start gap-4">
            <CommunityCard
              v-for="(item, i) in standings.items.value"
              :key="item.community.id"
              :community="item.community"
              :user-id="session.user?.id"
              :active="store.activeId === item.community.id"
              :state="item.state"
              :pending="pending.info.value[i]"
              @activate="makeActive(item.community)"
              @retry="standings.refetch()"
            />
            <RouterLink
              to="/comunidades/crear"
              class="border-border-input text-heading hover:bg-surface-muted focus-visible:outline-focus-ring flex min-h-60 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 text-center focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span
                class="bg-tint text-tint-fg inline-flex size-14 items-center justify-center rounded-full"
              >
                <PIcon name="plus" :size="24" />
              </span>
              <span class="t-header">{{ t('communities.createCard.title') }}</span>
              <span class="text-muted text-sm">{{ t('communities.createCard.text') }}</span>
            </RouterLink>
          </div>
        </section>

        <aside class="flex min-w-0 flex-col gap-6">
          <JoinCommunityForm @joined="joined" />
          <section class="bg-tint flex flex-col items-start gap-2 rounded-lg p-5">
            <h2 class="text-heading font-bold">{{ t('communities.more.title') }}</h2>
            <p class="text-tint-fg text-sm">{{ t('communities.more.text') }}</p>
            <PButton variant="outline" size="sm" to="/comunidades/explorar?tab=abiertas">{{
              t('communities.more.cta')
            }}</PButton>
          </section>
        </aside>
      </div>
    </template>

    <p class="sr-only" role="status">{{ announcement }}</p>
  </div>
</template>

<style>
.split-r {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 901px) {
  .split-r {
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: start;
  }
}
</style>
