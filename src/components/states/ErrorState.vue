<script setup lang="ts">
import SectionError from '@/components/ui/SectionError.vue'

/** Error de sección con «Reintentar» (llama a `refetch`). Es el `SectionError` de T7. */
defineProps<{ what?: string; error?: unknown }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <SectionError :what="what" :error="error" @retry="$emit('retry')" />
</template>
