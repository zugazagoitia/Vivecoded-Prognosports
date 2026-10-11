<script setup lang="ts">
import PIcon from '@/components/ui/PIcon.vue'
import type { Banner } from '@/lib/results'

/** State of the session (before closing / predictions visible / confirmed result). */
defineProps<{ banner: Banner }>()
const TONE = {
  info: 'bg-info-tint text-info-fg',
  warn: 'bg-warn-tint text-warn-fg',
  ok: 'bg-ok-tint text-ok-fg',
} as const
</script>

<template>
  <div
    role="status"
    :data-moment-banner="banner.tone"
    class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium"
    :class="TONE[banner.tone]"
  >
    <PIcon :name="banner.icon" :size="20" />
    <p>{{ banner.text }}</p>
  </div>
</template>
