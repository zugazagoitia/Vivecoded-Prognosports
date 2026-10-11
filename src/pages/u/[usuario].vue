<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import OtherProfile from '@/components/profile/OtherProfile.vue'
import { ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useMobileTitle } from '@/composables/useMobileNav'
import { useOtherUser } from '@/queries/profile'
import { useSessionStore } from '@/stores/session'

/**
 * `/u/:usuario` (the `/user/:user` alternative of the spec is not registered). Another member's public profile (U2). The parameter is an
 * id or a username (⚠️ to confirm which one the ranking links use; both are accepted). When it is
 * the signed-in user, U1 (own profile) owns the screen: until it lands this shows a placeholder.
 */
definePage({
  meta: {
    layout: 'app',
    title: 'route.user',
    guards: ['auth', 'verified', 'community'],
  },
})

const { t } = useI18n()
const route = useRoute('/u/[usuario]')
const session = useSessionStore()
const param = computed(() => String(route.params.usuario))

const isMe = computed(() => {
  const me = session.user
  return (
    !!me && (param.value === 'me' || param.value === String(me.id) || param.value === me.username)
  )
})
const user = useOtherUser(param, () => !isMe.value)
useMobileTitle(() => t('userProfile.mobileTitle'))
</script>

<template>
  <div v-if="isMe" class="pg-main">
    <h1 class="t-title text-heading">{{ t('userProfile.mobileTitle') }}</h1>
    <p>{{ t('userProfile.own.pending') }}</p>
  </div>
  <div v-else-if="user.notFound.value" class="pg-main">
    <section class="flex flex-col items-center gap-3 py-12 text-center">
      <PTitle>{{ t('userProfile.notFound.title') }}</PTitle>
      <p class="text-muted max-w-md">{{ t('userProfile.notFound.text') }}</p>
      <PButton to="/home" icon="ranking-star">{{ t('userProfile.notFound.action') }}</PButton>
    </section>
  </div>
  <div v-else-if="user.isError.value" class="pg-main">
    <ErrorState
      :what="t('userProfile.error.user')"
      :error="user.error.value"
      @retry="user.refetch()"
    />
  </div>
  <div v-else-if="!user.data.value" class="pg-main flex flex-col gap-6">
    <h1 class="sr-only">{{ t('loading') }}</h1>
    <Skeleton variant="avatar" />
    <Skeleton variant="card" />
  </div>
  <OtherProfile v-else :user="user.data.value" />
</template>
