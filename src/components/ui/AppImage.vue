<script setup lang="ts">
// Images (requisitos §23.6): explicit size avoids layout shift; lazy unless above the fold.
withDefaults(
  defineProps<{ src: string; alt: string; width: number; height: number; eager?: boolean }>(),
  { eager: false },
)
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : undefined"
    decoding="async"
  />
</template>
