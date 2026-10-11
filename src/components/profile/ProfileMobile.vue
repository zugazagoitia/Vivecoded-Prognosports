<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { EmptyState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import type { IconName } from '@/components/ui/icons'
import { focusRing } from '@/components/ui/styles'
import { useFlag } from '@/flags'
import { miniBars } from '@/lib/home'
import { useSessionStore } from '@/stores/session'
import ProfileHeader from './ProfileHeader.vue'
import ProfileKpis from './ProfileKpis.vue'
import { useProfile } from './useProfile'

/** Phone version (PerfilMovil): identity, 2x2 figures, points per GP and the account links. */
const { t } = useI18n()
const router = useRouter()
const session = useSessionStore()
const profile = useProfile()
const mySeasonOn = useFlag('MY_SEASON')
const bars = computed(() => miniBars(profile.standing.standing, profile.scope.userId))
const count = computed(() => profile.communities.data?.length ?? 0)
const mySeasonTo = computed(() =>
  profile.scope.activeId != null && profile.scope.seasonId != null
    ? `/ranking/${profile.scope.activeId}/${profile.scope.seasonId}/comparar/mi-temporada`
    : undefined,
)

interface Link {
  key: string
  icon: IconName
  label: string
  to: string
  count?: number
}
const links = computed<Link[]>(() => [
  ...(mySeasonOn.value && mySeasonTo.value
    ? [
        {
          key: 'season',
          icon: 'chart-line' as const,
          label: t('profile.mobile.mySeason'),
          to: mySeasonTo.value,
        },
      ]
    : []),
  {
    key: 'communities',
    icon: 'users',
    label: t('profile.mobile.myCommunities'),
    to: '/comunidades',
    count: count.value,
  },
  {
    key: 'notifications',
    icon: 'bell',
    label: t('profile.mobile.notifications'),
    to: '/ajustes#avisos',
  },
  { key: 'settings', icon: 'gear', label: t('profile.mobile.settings'), to: '/ajustes' },
])

async function logout() {
  await session.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="flex flex-col gap-4 px-4 pt-4 pb-6">
    <h1 class="sr-only">{{ t('profile.title') }}</h1>
    <ProfileHeader compact />
    <ProfileKpis compact />

    <section
      class="bg-surface ring-card-ring flex flex-col gap-3 rounded-lg p-4 shadow-(--card-shadow) ring-1"
      aria-labelledby="profile-bars-title"
    >
      <h2 id="profile-bars-title" class="text-heading m-0 text-base font-semibold">
        {{ t('profile.mobile.bars') }}
      </h2>
      <Skeleton v-if="profile.standing.isLoading" variant="chart" />
      <EmptyState
        v-else-if="!bars.length"
        icon="show_chart"
        :title="t('profile.season.empty.title')"
      />
      <div
        v-else
        role="img"
        :aria-label="t('profile.mobile.barsAlt')"
        class="flex h-[70px] items-end gap-[3px]"
      >
        <span
          v-for="b in bars"
          :key="b.gp.id"
          class="min-h-0.5 flex-1 rounded-t-sm"
          :class="b.won ? 'bg-primary' : 'bg-brand-300'"
          :style="{ height: `${Math.max(b.height, 2)}%` }"
        />
      </div>
    </section>

    <nav :aria-label="t('profile.mobile.links')">
      <ul
        class="bg-surface ring-card-ring m-0 flex list-none flex-col overflow-hidden rounded-lg p-0 shadow-(--card-shadow) ring-1"
      >
        <li v-for="l in links" :key="l.key" class="border-border border-t first:border-t-0">
          <RouterLink
            :to="l.to"
            class="text-heading flex min-h-[52px] items-center gap-3 px-4 text-sm font-medium no-underline"
            :class="focusRing"
          >
            <PIcon :name="l.icon" :size="20" />
            <span class="flex-1">{{ l.label }}</span>
            <PTag v-if="l.count != null" color="gray">{{ l.count }}</PTag>
            <PIcon v-else name="chevron-right" :size="16" />
          </RouterLink>
        </li>
      </ul>
    </nav>

    <PButton variant="outline" block class="min-h-12" icon="right-from-bracket" @click="logout">
      {{ t('profile.mobile.logout') }}
    </PButton>
  </div>
</template>
