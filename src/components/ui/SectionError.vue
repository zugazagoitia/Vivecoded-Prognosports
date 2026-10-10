<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { messageFor } from '@/api/messages'
import PIcon from './PIcon.vue'

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
    <PIcon name="circle-exclamation" :size="24" />
    <h2>{{ title }}</h2>
    <p v-if="error">{{ messageFor(error) }}</p>
    <div class="section-error-actions">
      <button type="button" @click="$emit('retry')">{{ t('errors.section.retry') }}</button>
      <RouterLink to="/">{{ t('errors.section.home') }}</RouterLink>
    </div>
  </section>
</template>
