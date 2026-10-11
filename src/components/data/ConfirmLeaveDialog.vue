<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ stay: []; leave: [] }>()

const { t } = useI18n()
</script>

<template>
  <!-- Closing the modal (Escape, X, overlay) means staying on the page. -->
  <PrognoModal
    :open="open"
    :title="t('data.leave.title')"
    :description="t('data.leave.body')"
    @update:open="(v) => !v && emit('stay')"
  >
    <template #footer>
      <PButton @click="emit('stay')">{{ t('data.leave.stay') }}</PButton>
      <PButton variant="outline" @click="emit('leave')">{{ t('data.leave.leave') }}</PButton>
    </template>
  </PrognoModal>
</template>
