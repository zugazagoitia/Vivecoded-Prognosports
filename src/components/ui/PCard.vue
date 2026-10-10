<script setup lang="ts">
import PTitle from './PTitle.vue'

/** Surface for a block of content: optional header (`title` or slot), body and footer slot. */
withDefaults(
  defineProps<{ title?: string; tag?: 'article' | 'section' | 'div'; padded?: boolean }>(),
  { padded: true },
)
</script>

<template>
  <component
    :is="tag ?? 'section'"
    class="bg-surface ring-card-ring min-w-0 rounded-lg shadow-(--card-shadow) ring-1"
  >
    <header
      v-if="title || $slots.header"
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
    >
      <slot name="header"
        ><PTitle level="header">{{ title }}</PTitle></slot
      >
    </header>
    <div :class="padded ? 'p-3 sm:p-5' : ''"><slot /></div>
    <footer
      v-if="$slots.footer"
      class="border-border flex flex-wrap items-center justify-end gap-3 border-t px-5 py-3"
    >
      <slot name="footer" />
    </footer>
  </component>
</template>
