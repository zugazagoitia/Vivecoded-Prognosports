<script setup lang="ts">
import PIcon from '@/components/ui/PIcon.vue'
import type { IconName } from '@/components/ui/icons'

/** Round 56 px badge with a decorative icon (recovery steps). */
defineProps<{ icon: IconName; tone?: 'tint' | 'ok' }>()
</script>

<template>
  <div
    class="flex size-14 shrink-0 items-center justify-center rounded-full"
    :class="tone === 'ok' ? 'bg-ok-tint text-ok-fg' : 'bg-tint text-tint-fg'"
    aria-hidden="true"
  >
    <PIcon :name="icon" :size="24" />
  </div>
</template>
