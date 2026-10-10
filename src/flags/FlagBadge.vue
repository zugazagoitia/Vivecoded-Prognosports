<script setup lang="ts">
import { isPreviewEnv } from './index'

const show = isPreviewEnv()
const LABEL = 'Feature flag'
</script>

<template>
  <span v-if="show" class="flag"
    ><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="currentColor">
      <path d="M3 1h1.5v14H3zM5 2h8l-2 3 2 3H5z" /></svg
    >{{ LABEL }}</span
  >
</template>
