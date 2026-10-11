<script setup lang="ts">
import { ErrorState, Skeleton } from '@/components/states'
import PCard from '@/components/ui/PCard.vue'
import PTitle from '@/components/ui/PTitle.vue'

/**
 * Card of the GP weekend with its own loading (skeleton) and error (retry) states, so one
 * failing block never hides the rest (F6).
 */
withDefaults(
  defineProps<{
    title: string
    loading?: boolean
    error?: unknown
    /** Noun phrase for the error title: «No hemos podido cargar {what}». */
    what?: string
    lines?: number
  }>(),
  { lines: 3, error: undefined, what: undefined },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <PCard>
    <template #header>
      <PTitle level="header" as="h2">{{ title }}</PTitle>
      <slot name="aside" />
    </template>
    <ErrorState v-if="error" :what="what" :error="error" @retry="$emit('retry')" />
    <Skeleton v-else-if="loading" variant="line" :lines="lines" />
    <slot v-else />
  </PCard>
</template>
