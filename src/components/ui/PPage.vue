<script setup lang="ts">
import Breadcrumb, { type Crumb } from './Breadcrumb.vue'
import PCard from './PCard.vue'
import PTitle from './PTitle.vue'

/** View frame: breadcrumb, title row with actions on the right, then the content. */
withDefaults(
  defineProps<{
    title: string
    breadcrumb?: Crumb[]
    /** `card`: content inside one PCard; `plain`: the view lays out its own cards. */
    variant?: 'card' | 'plain'
    /** Heading element of the title (h1 unless the page nests this frame). */
    titleAs?: 'h1' | 'h2'
  }>(),
  { variant: 'card' },
)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4">
    <Breadcrumb v-if="breadcrumb?.length" :items="breadcrumb" />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <PTitle :as="titleAs">{{ title }}</PTitle>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <PCard v-if="variant === 'card'"><slot /></PCard>
    <slot v-else />
  </div>
</template>
