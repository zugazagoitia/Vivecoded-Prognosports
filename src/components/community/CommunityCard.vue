<script setup lang="ts">
import { ErrorState, Skeleton } from '@/components/states'
import PCard from '@/components/ui/PCard.vue'
import PTitle from '@/components/ui/PTitle.vue'

/**
 * Card shell of the community page: `h2` title, optional `aside` slot in the header (a link or a
 * tag), optional `footer` slot, and its own loading (skeleton) / error (retry) states so one failing
 * block never hides the rest (F6, req. 1.9).
 *
 * Props: `title`, `loading`, `error` (any thrown value), `what` (noun phrase of the error title,
 * «No hemos podido cargar {what}»), `lines` (text skeleton), `rows` (table skeleton instead),
 * `flush` (no padding around the content, for tables). Emits `retry`.
 * Shared with the other community pages (H4/H6/H7).
 */
withDefaults(
  defineProps<{
    title: string
    loading?: boolean
    error?: unknown
    what?: string
    lines?: number
    rows?: number
    flush?: boolean
  }>(),
  { lines: 3, error: undefined, what: undefined, rows: 0 },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <PCard :padded="false">
    <template #header>
      <PTitle level="header" as="h2">{{ title }}</PTitle>
      <slot name="aside" />
    </template>
    <div :class="flush && !loading && !error ? '' : 'p-3 sm:p-5'">
      <ErrorState v-if="error" :what="what" :error="error" @retry="$emit('retry')" />
      <Skeleton
        v-else-if="loading"
        :variant="rows ? 'table' : 'line'"
        :rows="rows"
        :lines="lines"
      />
      <slot v-else />
    </div>
    <template v-if="$slots.footer && !loading && !error" #footer><slot name="footer" /></template>
  </PCard>
</template>
