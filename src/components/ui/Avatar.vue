<script setup lang="ts">
import { initials as initialsOf } from '@/lib/communities'
import { computed } from 'vue'

export type AvatarSize = 24 | 32 | 40 | 56

const props = withDefaults(
  defineProps<{
    /** Full name; also the accessible name. */
    name: string
    size?: AvatarSize
    /** The signed-in user: always solid purple. */
    you?: boolean
  }>(),
  { size: 32 },
)

/** First letters of the first two words, upper case. */
const initials = computed(() => initialsOf(props.name))

const sizes: Record<AvatarSize, string> = {
  24: 'size-6 text-[10px]',
  32: 'size-8 text-xs',
  40: 'size-10 text-sm',
  56: 'size-14 text-lg',
}
</script>

<template>
  <span
    role="img"
    :aria-label="name"
    :class="[
      'inline-flex flex-none items-center justify-center rounded-full leading-none font-bold tracking-[0.02em]',
      sizes[size],
      you ? 'bg-primary text-on-primary' : 'bg-tint text-tint-fg',
    ]"
  >
    <span aria-hidden="true">{{ initials }}</span>
  </span>
</template>
