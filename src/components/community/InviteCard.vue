<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toaster } from '@/composables/useToast'
import PButton from '@/components/ui/PButton.vue'
import PInput from '@/components/ui/PInput.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import PTag from '@/components/ui/PTag.vue'
import { invitationUrl } from '@/lib/community'
import CommunityCard from './CommunityCard.vue'

/**
 * «Invitar» block: read-only invitation link (`{origin}/unirse/{code}`), copy button (the icon
 * turns into a check and a `role="status"` message says «Enlace copiado.» for 3 s) and, only when
 * `canRegenerate`, «Regenerar enlace» behind a confirmation modal. Every member sees the link;
 * only people with `can_recreate_invitation` (or the creator) can regenerate it.
 *
 * Props: `invitation` (code), `open` (access tag), `canRegenerate`, `regenerating` (busy state),
 * `loading`, `error`. Emits `regenerate` (after the user confirms; the parent runs the
 * mutation, e.g. `useRegenerateInvitation`) and `retry`.
 */
const props = defineProps<{
  invitation?: string | null
  open?: boolean
  canRegenerate?: boolean
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
    toaster.error(t('community.invite.copyFailed'))
    return
  }
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = false), 3000)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <CommunityCard
    :title="t('community.invite.title')"
    :loading="loading"
    :error="error"
    :what="t('community.error.community')"
    @retry="$emit('retry')"
  >
    <template #aside>
      <PTag :color="open ? 'ok' : 'brand'" :icon="open ? 'lock-open' : 'lock'">{{
        open ? t('community.header.open') : t('community.header.closed')
      }}</PTag>
    </template>
    <div v-if="url" class="flex flex-col gap-3">
      <p class="text-muted text-sm">
        {{ open ? t('community.invite.textOpen') : t('community.invite.text') }}
      </p>
      <div class="flex gap-2">
        <PInput
          :model-value="url"
          readonly
          :aria-label="t('community.invite.link')"
          class="text-[13px]"
        />
        <PButton
          icon-only
          :icon="copied ? 'check' : 'copy'"
          :aria-label="t('community.invite.copy')"
          @click="copy"
        />
      </div>
      <div aria-live="polite">
        <PrognoAlert v-if="copied" variant="ok" :title="t('community.invite.copied')" />
      </div>
      <PButton
        v-if="canRegenerate"
        variant="outline"
        size="sm"
        icon="rotate-right"
        :loading="regenerating"
        class="self-start"
        @click="confirming = true"
      >
        {{ t('community.invite.regenerate') }}
      </PButton>
      <PrognoModal
        v-model:open="confirming"
        :title="t('community.invite.confirm.title')"
        :description="t('community.invite.confirm.text')"
        :confirm-label="t('community.invite.confirm.action')"
        @confirm="$emit('regenerate')"
      />
    </div>
    <p v-else class="text-muted text-sm">{{ t('community.invite.none') }}</p>
  </CommunityCard>
</template>
