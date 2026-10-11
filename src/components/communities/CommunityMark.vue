<script setup lang="ts">
import { computed, ref } from 'vue'
import { communityImageUrl } from '@/api/communities'
import AppImage from '@/components/ui/AppImage.vue'
import { communityTone, initials } from '@/lib/communities'

/**
 * Community avatar: its image when `hasImage`, otherwise the initials (first letter of the first
 * two words) on a background tone derived from the id (design-system tokens, white text).
 * Decorative (`aria-hidden`): the community name always sits next to it.
 *
 * Props: `community` ({ id, name, hasImage }), `size` in px (default 48).
 */
const props = withDefaults(
  defineProps<{
    community: { id: number; name: string; hasImage?: boolean | null | undefined }
    size?: 32 | 48 | 56 | 72
  }>(),
  { size: 48 },
)
const failed = ref(false)
const showImage = computed(() => props.community.hasImage === true && !failed.value)
const tone = computed(() => communityTone(props.community))
const box = {
  32: 'size-8 text-xs',
  48: 'size-12 text-lg',
  56: 'size-14 text-xl',
  72: 'size-18 text-[26px]',
} as const
</script>

<template>
  <span
    aria-hidden="true"
    :class="[
      'inline-flex flex-none items-center justify-center overflow-hidden rounded-xl leading-none font-bold',
      box[size],
      showImage ? 'bg-surface-muted' : tone,
    ]"
  >
    <AppImage
      v-if="showImage"
      :src="communityImageUrl(community.id)"
      alt=""
      :width="size"
      :height="size"
      class="size-full object-cover"
      @error="failed = true"
    />
    <template v-else>{{ initials(community.name) }}</template>
  </span>
</template>
