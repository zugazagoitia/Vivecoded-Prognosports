<script setup lang="ts">
import markLight from '@/assets/logo/logo.png'
import markDarkBrand from '@/assets/logo/batch_color_OFF.png'

// Light: tight mark on transparent ground. Dark: on `surface` the maroon layer disappears,
// so the "OFF" tile (white P on brand-500) is used. Switched in CSS with the same selectors
// as the theme tokens, so there is no flash and no JS dependency.
withDefaults(defineProps<{ size?: number; wordmark?: boolean }>(), { size: 28, wordmark: true })
const brand = 'PrognoSports'
</script>

<template>
  <span class="app-logo">
    <img class="app-logo-light" :src="markLight" alt="" :width="size" :height="size" />
    <img class="app-logo-dark" :src="markDarkBrand" alt="" :width="size" :height="size" />
    <span v-if="wordmark" class="app-logo-word">{{ brand }}</span>
    <span v-else class="sr-only">{{ brand }}</span>
  </span>
</template>

<style>
.app-logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
.app-logo img {
  object-fit: contain;
  border-radius: 4px;
}
.app-logo-dark {
  display: none;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .app-logo-light {
    display: none;
  }
  :root:not([data-theme='light']) .app-logo-dark {
    display: block;
  }
}
:root[data-theme='dark'] .app-logo-light {
  display: none;
}
:root[data-theme='dark'] .app-logo-dark {
  display: block;
}
</style>
