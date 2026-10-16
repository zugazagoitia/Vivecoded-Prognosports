<script setup lang="ts">
import { initials as initialsOf } from '@/lib/communities'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiUrl, userApi } from '@/api'

/** Round avatar: the profile photo when there is one, else the initials on the «you» colour. */
const props = defineProps<{
  id: number
  name: string
  hasImage?: boolean
  /** 88 on desktop, 72 on the phone. */
  size: 72 | 88
}>()
const { t } = useI18n()
const failed = ref(false)
const initials = computed(() => initialsOf(props.name))
const src = computed(() => apiUrl(userApi.userImagePath(props.id)))
</script>

<template>
  <img
    v-if="hasImage && !failed"
    :src="src"
    :alt="t('profile.header.photo', { name })"
    :width="size"
    :height="size"
    class="flex-none rounded-full object-cover"
    :class="size === 88 ? 'size-22' : 'size-18'"
    @error="failed = true"
  />
  <span
    v-else
    role="img"
    :aria-label="name"
    class="bg-series-you text-on-primary inline-flex flex-none items-center justify-center rounded-full font-bold"
    :class="size === 88 ? 'size-22 text-[30px]' : 'size-18 text-[26px]'"
  >
    <span aria-hidden="true">{{ initials }}</span>
  </span>
</template>
