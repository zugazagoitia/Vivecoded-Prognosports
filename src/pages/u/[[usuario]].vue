<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OtherUser from '@/components/profile/OtherUser.vue'
import ProfileCommunities from '@/components/profile/ProfileCommunities.vue'
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileHistory from '@/components/profile/ProfileHistory.vue'
import ProfileKpis from '@/components/profile/ProfileKpis.vue'
import ProfileMobile from '@/components/profile/ProfileMobile.vue'
import ProfileSeasonChart from '@/components/profile/ProfileSeasonChart.vue'
import { createProfileState, provideProfile } from '@/components/profile/useProfile'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: {
    layout: 'app',
    title: 'route.user',
    guards: ['auth', 'verified', 'community'],
  },
})

// `/u`, `/u/me` and `/u/<own username>` are the own profile (U1); anything else is another user (U2).
const route = useRoute()
const session = useSessionStore()
const mobile = useMediaQuery(MOBILE_QUERY)
const param = computed(() => {
  const p = (route.params as Record<string, string | string[] | undefined>).usuario
  return (Array.isArray(p) ? p[0] : p) ?? ''
})
const isOwn = computed(() => {
  const p = decodeURIComponent(param.value).toLowerCase()
  return (
    p === '' ||
    p === 'me' ||
    p === String(session.user?.id ?? '') ||
    p === (session.user?.username ?? '').toLowerCase()
  )
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
  <OtherUser v-else :param="decodeURIComponent(param)" />
</template>
