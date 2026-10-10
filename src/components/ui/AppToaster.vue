<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>

<template>
  <Toaster position="bottom-right" :visible-toasts="4" />
</template>

<style>
@media (prefers-reduced-motion: reduce) {
  [data-sonner-toast],
  [data-sonner-toaster] {
    transition: none !important;
    animation: none !important;
  }
}
</style>
