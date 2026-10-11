<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import OtherProfile from '@/components/profile/OtherProfile.vue'
import { ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useMobileTitle } from '@/composables/useMobileNav'
import { useOtherUser } from '@/queries/userProfile'

const { t } = useI18n()
const props = defineProps<{ param: string }>()
const user = useOtherUser(
  () => props.param,
  () => true,
)
useMobileTitle(() => t('userProfile.mobileTitle'))
</script>

<template>
  <div v-if="user.notFound.value" class="pg-main">
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
