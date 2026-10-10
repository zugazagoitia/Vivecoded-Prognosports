<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { messageFor } from '@/api/messages'
import StateAction from '@/components/states/StateAction.vue'
import PIcon from './PIcon.vue'
import { iconFor } from './icons'

const props = defineProps<{
  /** Noun phrase completing "No hemos podido cargar …" (e.g. "la clasificación"). */
  what?: string
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
const title = computed(() =>
  props.what ? t('errors.section.title', { what: props.what }) : t('errors.section.titleGeneric'),
)
</script>

<template>
  <section class="section-error" role="alert">
    <span class="section-error-ic"><PIcon :name="iconFor('cloud_off')" :size="24" /></span>
    <h2>{{ title }}</h2>
    <p v-if="error">{{ messageFor(error) }}</p>
    <p>{{ t('errors.section.safe') }}</p>
    <div class="section-error-actions">
      <StateAction @click="$emit('retry')">{{ t('errors.section.retry') }}</StateAction>
      <StateAction to="/" variant="ghost">{{ t('errors.section.home') }}</StateAction>
    </div>
  </section>
</template>

<style scoped>
.section-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  padding: 2.5rem 1.5rem;
  color: var(--color-muted);
  font-size: 0.875rem;
}
.section-error-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--color-err-tint);
  color: var(--color-err-fg);
}
h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-heading);
}
.section-error-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
