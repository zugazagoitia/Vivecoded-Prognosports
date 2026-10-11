<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import CommunityCard from './CommunityCard.vue'

/**
 * «Zona de riesgo» card: leave the community behind a confirmation modal (focus trapped, closes
 * with Escape). The creator cannot leave (decision: the API/spec define no ownership transfer, so
 * leaving would orphan the community): the button is disabled and the text explains why.
 *
 * Props: `name` (community, for the modal title), `isOwner`, `leaving` (busy state). Emits
 * `leave` once the user confirms; the parent runs `useLeaveCommunity` and navigates away.
 */
defineProps<{ name: string; isOwner?: boolean; leaving?: boolean }>()
defineEmits<{ leave: [] }>()
const { t } = useI18n()
const confirming = ref(false)
</script>

<template>
  <CommunityCard :title="t('community.leave.title')">
    <div class="flex flex-col gap-2">
      <p class="text-muted text-sm">
        {{ isOwner ? t('community.leave.owner') : t('community.leave.text') }}
      </p>
      <PButton
        variant="outline"
        size="sm"
        icon="right-from-bracket"
        :disabled="isOwner"
        :loading="leaving"
        class="text-err! border-err! self-start"
        @click="confirming = true"
      >
        {{ t('community.leave.action') }}
      </PButton>
      <PrognoModal
        v-model:open="confirming"
        destructive
        :title="t('community.leave.confirm.title', { name })"
        :description="t('community.leave.confirm.text')"
        :confirm-label="t('community.leave.confirm.action')"
        @confirm="$emit('leave')"
      />
    </div>
  </CommunityCard>
</template>
