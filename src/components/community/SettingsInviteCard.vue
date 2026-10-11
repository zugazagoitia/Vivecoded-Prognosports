<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PInput from '@/components/ui/PInput.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import PTag from '@/components/ui/PTag.vue'
import { toaster } from '@/composables/useToast'
import { COPIED_MS } from '@/lib/community-settings'
import { invitationUrl } from '@/lib/community'
import CommunityCard from './CommunityCard.vue'

/**
 * «Invitación» block of the settings (H6): access tag, read-only link, «Copiar» -> «Copiado» (with
 * a check icon, announced through a live region for `COPIED_MS`) and «Regenerar enlace» behind the
 * confirmation modal (destructive, focus on «Cancelar», Escape/backdrop close it).
 *
 * Props: `invitation` (code), `open` (access tag), `regenerating`, `loading`, `error`. Emits
 * `regenerate` (after confirming) and `retry`.
 */
const props = defineProps<{
  invitation?: string | null
  open?: boolean
  regenerating?: boolean
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ regenerate: []; retry: [] }>()
const { t } = useI18n()

const url = computed(() => (props.invitation ? invitationUrl(props.invitation) : ''))
const copied = ref(false)
const confirming = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
  } catch {
    toaster.error(t('communitySettings.invite.copyFailed'))
    return
  }
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = false), COPIED_MS)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <CommunityCard
    :title="t('communitySettings.invite.title')"
    :loading="loading"
    :error="error"
    :what="t('communitySettings.error.invitation')"
    @retry="$emit('retry')"
  >
    <template #aside>
      <PTag :color="open ? 'ok' : 'brand'" :icon="open ? 'lock-open' : 'lock'">{{
        open ? t('community.header.open') : t('community.header.closed')
      }}</PTag>
    </template>
    <div v-if="url" class="flex flex-col gap-3">
      <p class="text-muted text-sm">
        {{ open ? t('communitySettings.invite.textOpen') : t('communitySettings.invite.text') }}
      </p>
      <div class="flex flex-wrap items-start gap-2">
        <div class="min-w-[220px] flex-1">
          <PInput
            :model-value="url"
            readonly
            :aria-label="t('communitySettings.invite.link')"
            class="text-[13px]"
          />
        </div>
        <PButton :icon="copied ? 'check' : 'copy'" @click="copy">
          <span aria-live="polite">{{
            copied ? t('communitySettings.invite.copied') : t('communitySettings.invite.copy')
          }}</span>
        </PButton>
      </div>
      <PButton
        variant="outline"
        size="sm"
        icon="rotate-right"
        :loading="regenerating"
        class="self-start"
        @click="confirming = true"
      >
        {{ t('communitySettings.invite.regenerate') }}
      </PButton>
      <PrognoModal
        v-model:open="confirming"
        destructive
        :title="t('communitySettings.invite.confirm.title')"
        :description="t('communitySettings.invite.confirm.text')"
        :confirm-label="t('communitySettings.invite.confirm.action')"
        @confirm="$emit('regenerate')"
      />
    </div>
    <p v-else class="text-muted text-sm">{{ t('communitySettings.invite.none') }}</p>
  </CommunityCard>
</template>
