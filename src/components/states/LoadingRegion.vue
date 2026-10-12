<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'

/**
 * Envuelve un bloque que carga: `aria-busy` mientras `loading`, esqueleto (slot `skeleton`) y,
 * si `slow` (ver `useSlowLoading`), el aviso «Está tardando más de lo normal» con «Reintentar».
 */
defineProps<{ loading: boolean; slow?: boolean }>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>

<template>
  <div :aria-busy="loading">
    <template v-if="loading">
      <slot name="skeleton" />
      <div v-if="slow" class="slow-loading" role="status">
        <span>{{ t('states.loading.slowTitle') }}</span>
        <PButton variant="outline" @click="$emit('retry')">{{ t('states.loading.retry') }}</PButton>
      </div>
    </template>
    <slot v-else />
  </div>
</template>

<style scoped>
.slow-loading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-muted);
}
</style>
