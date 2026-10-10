<script setup lang="ts">
import { useOnline } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import { iconFor } from '@/components/ui/icons'

const online = useOnline()
const { t } = useI18n()
</script>

<template>
  <div v-if="!online" class="offline-notice" role="alert">
    <PIcon :name="iconFor('wifi_off')" :size="20" />
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
  background: var(--warn-bg, #fef3c7);
  color: var(--warn, #92400e);
}
</style>
