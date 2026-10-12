<script setup lang="ts">
import { isPreviewEnv } from './index'

const show = isPreviewEnv()
const LABEL = 'Feature flag'
</script>

<template>
  <span v-if="show" class="flag"
    ><svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" fill="currentColor">
      <path d="M3 1h1.5v14H3zM5 2h8l-2 3 2 3H5z" /></svg
    >{{ LABEL }}</span
  >
</template>

<style scoped>
.flag {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1rem;
  white-space: nowrap;
  color: var(--color-white);
  background: var(--color-brand-accent-700);
  border-radius: 9999px;
}
</style>
