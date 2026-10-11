<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CommunityCard from '@/components/community/CommunityCard.vue'
import PButton from '@/components/ui/PButton.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import PTag from '@/components/ui/PTag.vue'

/**
 * «Telegram» (U3, `#telegram`). Linked: tag + «Desvincular» (asks first, acts at once). Not
 * linked: only the explanation; linking needs the Telegram login widget, which is not
 * implemented yet (TO CONFIRM, see the issue). Props: `linked`, `username`, `unlinking`, `block`
 * (mobile: full-width button), `loading`, `error`. Emits `unlink` and `retry`.
 */
defineProps<{
  linked: boolean
  username?: string
  unlinking?: boolean
  block?: boolean
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ unlink: []; retry: [] }>()
const { t } = useI18n()
const confirm = ref(false)
</script>

<template>
  <CommunityCard
    :title="t('account.telegram.title')"
    :loading="loading"
    :error="error"
    :what="t('account.loadError')"
    @retry="$emit('retry')"
  >
    <template #aside>
      <PTag v-if="linked" color="ok" icon="check">
        {{
          username
            ? t('account.telegram.linkedAs', { name: username })
            : t('account.telegram.linked')
        }}
      </PTag>
      <PTag v-else>{{ t('account.telegram.notLinked') }}</PTag>
    </template>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-muted max-w-[520px] text-sm">
        {{ linked ? t('account.telegram.text') : t('account.telegram.notLinkedText') }}
      </p>
      <PButton
        v-if="linked"
        variant="outline"
        size="sm"
        :block="block"
        :loading="unlinking"
        @click="confirm = true"
      >
        {{ t('account.telegram.unlink') }}
      </PButton>
    </div>
    <PrognoModal
      v-model:open="confirm"
      destructive
      :title="t('account.telegram.confirm.title')"
      :description="t('account.telegram.confirm.text')"
      :confirm-label="t('account.telegram.unlink')"
      @confirm="$emit('unlink')"
    />
  </CommunityCard>
</template>
