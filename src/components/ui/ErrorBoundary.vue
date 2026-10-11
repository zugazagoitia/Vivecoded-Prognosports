<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
import { reportError } from '@/lib/report'
import SectionError from './SectionError.vue'

defineProps<{ what?: string }>()
const error = ref<unknown>(null)
const failed = ref(false)

onErrorCaptured((err, _instance, info) => {
  error.value = err
  failed.value = true
  reportError(err, `ErrorBoundary: ${info}`)
  return false // stop propagation: the rest of the page keeps working
})

function retry() {
  failed.value = false
  error.value = null
}
</script>

<template>
  <SectionError v-if="failed" :what="what" :error="error" @retry="retry" />
  <slot v-else />
</template>
