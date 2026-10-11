<script setup lang="ts">
import { useId } from 'vue'
import FlagBadge from '@/flags/FlagBadge.vue'

/**
 * Card of the ranking screens: title (+ feature-flag badge in previews), subtitle, controls on
 * the right, body and an optional footer (legend). The `.card-h` / `.card-b` / `.card-f` of the
 * mockups.
 */
withDefaults(
  defineProps<{ title: string; subtitle?: string; flag?: boolean; padded?: boolean }>(),
  {
    subtitle: undefined,
    flag: false,
    padded: true,
  },
)
const id = `rk-${useId()}`
</script>

<template>
  <section
    :aria-labelledby="id"
    class="bg-surface ring-card-ring min-w-0 rounded-lg shadow-(--card-shadow) ring-1"
  >
    <header
      class="border-border flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4"
    >
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 :id="id" class="t-header text-heading">{{ title }}</h2>
          <FlagBadge v-if="flag" />
        </div>
        <p v-if="subtitle" class="text-muted text-sm">{{ subtitle }}</p>
      </div>
      <div
        v-if="$slots.controls"
        class="flex max-w-full min-w-0 flex-wrap items-center gap-2 [&>*]:max-w-full [&>*]:overflow-x-auto"
      >
        <slot name="controls" />
      </div>
    </header>
    <div :class="padded ? 'flex flex-col gap-4 p-5' : ''"><slot /></div>
    <footer
      v-if="$slots.footer"
      class="border-border text-muted flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-5 py-3 text-xs leading-4"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>
