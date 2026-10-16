<script setup lang="ts">
import { initials as initialsOf } from '@/lib/communities'
import { computed, ref } from 'vue'
import { apiUrl } from '@/api/client'
import AppImage from '@/components/ui/AppImage.vue'

/**
 * Identity image of a community: the uploaded picture (`hasImage`, public
 * `GET /v2/communities/{id}/image`) or, without one (or if it fails to load), the initials on the
 * brand colour. Decorative: the name is always next to it. Props: `id`, `name`, `hasImage`,
 * `size` in px (default 72), `version` (cache-buster).
 */
const props = withDefaults(
  defineProps<{
    id: number | string
    name: string
    hasImage?: boolean | null
    size?: number
    /** Cache-buster: change it after replacing the picture (the URL is always the same). */
    version?: number
  }>(),
  { size: 72, hasImage: false, version: undefined },
)
const failed = ref(false)
const initials = computed(() => initialsOf(props.name))
const url = computed(
  () =>
    apiUrl(`/v2/communities/${encodeURIComponent(String(props.id))}/image`) +
    (props.version ? `?v=${props.version}` : ''),
)
</script>

<template>
  <span
    class="bg-primary text-on-primary inline-flex flex-none items-center justify-center overflow-hidden rounded-2xl font-bold"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px` }"
    data-testid="community-avatar"
  >
    <AppImage
      v-if="hasImage && !failed"
      :src="url"
      alt=""
      :width="size"
      :height="size"
      eager
      class="size-full object-cover"
      @error="failed = true"
    />
    <span v-else aria-hidden="true">{{ initials }}</span>
  </span>
</template>
