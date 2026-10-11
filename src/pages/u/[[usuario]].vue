<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import ProfileCommunities from '@/components/profile/ProfileCommunities.vue'
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileHistory from '@/components/profile/ProfileHistory.vue'
import ProfileKpis from '@/components/profile/ProfileKpis.vue'
import ProfileMobile from '@/components/profile/ProfileMobile.vue'
import ProfileSeasonChart from '@/components/profile/ProfileSeasonChart.vue'
import { createProfileState, provideProfile } from '@/components/profile/useProfile'
import { EmptyState } from '@/components/states'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: {
    layout: 'app',
    title: 'route.user',
    guards: ['auth', 'verified', 'community'],
  },
})

// `/u`, `/u/me` and `/u/<own username>` are the own profile (U1). Another user is U2, which is a
// separate screen: until it exists a neutral notice is shown.
const { t } = useI18n()
const route = useRoute()
const session = useSessionStore()
const mobile = useMediaQuery(MOBILE_QUERY)
const param = computed(() => {
  const p = (route.params as Record<string, string | string[] | undefined>).usuario
  return (Array.isArray(p) ? p[0] : p) ?? ''
})
const isOwn = computed(() => {
  const p = decodeURIComponent(param.value).toLowerCase()
  return p === '' || p === 'me' || p === (session.user?.username ?? '').toLowerCase()
})

const profile = createProfileState()
provideProfile(profile)
</script>

<template>
  <ProfileMobile v-if="isOwn && mobile" />
  <div v-else-if="isOwn" class="pg-main flex flex-col gap-6">
    <ProfileHeader />
    <ProfileKpis />
    <div class="grid items-start gap-6 min-[901px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <ProfileSeasonChart />
      <ProfileCommunities />
    </div>
    <ProfileHistory />
  </div>
  <div v-else class="pg-main">
    <h1 class="sr-only">{{ t('profile.otherUser.title') }}</h1>
    <EmptyState
      icon="person"
      :title="t('profile.otherUser.title')"
      :text="t('profile.otherUser.text')"
    />
  </div>
</template>
