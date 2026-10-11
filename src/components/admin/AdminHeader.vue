<script setup lang="ts">
import PTitle from '@/components/ui/PTitle.vue'

/** Title + subtitle on the left, actions on the right (the `.row.sp.wrapf` header of every M screen). */
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex min-w-0 flex-col gap-0.5">
      <PTitle
        ><slot name="title">{{ title }}</slot></PTitle
      >
      <p v-if="subtitle" class="text-muted">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </header>
</template>
