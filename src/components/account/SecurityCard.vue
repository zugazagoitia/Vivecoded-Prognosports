<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CommunityCard from '@/components/community/CommunityCard.vue'
import PButton from '@/components/ui/PButton.vue'
import PInput from '@/components/ui/PInput.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import EmailChangeForm from './EmailChangeForm.vue'
import PasswordChangeForm from './PasswordChangeForm.vue'

/** «Correo y contraseña» (U3, `#correo`), desktop. Each button acts on its own. */
defineProps<{ email?: string }>()
const { t } = useI18n()
const emailOpen = ref(false)
</script>

<template>
  <CommunityCard :title="t('account.security.title')">
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-[260px] flex-1">
          <PInput
            :model-value="email ?? ''"
            type="email"
            :label="t('account.security.email')"
            :help="t('account.security.emailHelp')"
            readonly
          />
        </div>
        <PButton variant="outline" class="mb-6" @click="emailOpen = true">
          {{ t('account.security.changeEmail') }}
        </PButton>
      </div>
      <PasswordChangeForm />
    </div>
    <PrognoModal v-model:open="emailOpen" :title="t('account.security.emailTitle')">
      <EmailChangeForm @done="emailOpen = false" />
      <template #footer><span /></template>
    </PrognoModal>
  </CommunityCard>
</template>
