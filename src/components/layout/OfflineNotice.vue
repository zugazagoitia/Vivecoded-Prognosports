<script setup lang="ts">
import { useOnline } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const online = useOnline()
const { t } = useI18n()
</script>

<template>
  <div v-if="!online" class="offline-notice" role="alert">
    <span class="material-symbols-outlined" aria-hidden="true">wifi_off</span>
    <span>{{ t('errors.offline') }}</span>
  </div>
</template>

<style scoped>
.offline-notice {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  background: var(--color-warn-tint);
  color: var(--color-warn-fg);
}
</style>
