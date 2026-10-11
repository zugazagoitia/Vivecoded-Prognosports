<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiUrl } from '@/api/client'
import { userImagePath } from '@/api/user'
import CommunityCard from '@/components/community/CommunityCard.vue'
import ImageCropDialog from '@/components/community/ImageCropDialog.vue'
import PButton from '@/components/ui/PButton.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import { toaster } from '@/composables/useToast'
import { avatarFileGuard } from '@/lib/account'

/**
 * «Foto de perfil» (U3, `#foto`): current picture or initials, «Subir foto» (type and 2 MB are
 * checked BEFORE the square crop opens) and «Quitar» (asks first). Acts at once, no SaveBar.
 * Props: `id`, `name`, `hasImage`, `version` (cache-buster), `uploading`, `removing`.
 * Emits `upload` (cropped Blob) and `remove`; the parent closes the crop with `v-model:cropping`.
 */
const props = defineProps<{
  id: number | string
  name: string
  hasImage?: boolean | null
  version?: number
  uploading?: boolean
  removing?: boolean
}>()
const cropping = defineModel<boolean>('cropping', { default: false })
defineEmits<{ upload: [blob: Blob]; remove: [] }>()
const { t } = useI18n()

const input = ref<HTMLInputElement>()
const file = ref<File>()
const confirmRemove = ref(false)
const failed = ref(false)

const initials = computed(() =>
  props.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join(''),
)
const url = computed(
  () => apiUrl(userImagePath(props.id)) + (props.version ? `?v=${props.version}` : ''),
)

function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  const picked = el.files?.[0]
  el.value = ''
  if (!picked) return
  const problem = avatarFileGuard(picked)
  if (problem) {
    toaster.error(t(`account.photo.errors.${problem}`))
    return
  }
  file.value = picked
  cropping.value = true
}
</script>

<template>
  <CommunityCard :title="t('account.photo.title')">
    <div class="flex flex-wrap items-center gap-5">
      <span
        class="bg-primary text-on-primary inline-flex size-20 flex-none items-center justify-center overflow-hidden rounded-full text-3xl font-bold"
        data-testid="account-avatar"
      >
        <img
          v-if="hasImage && !failed"
          :src="url"
          alt=""
          width="80"
          height="80"
          class="size-full object-cover"
          @error="failed = true"
        />
        <span v-else aria-hidden="true">{{ initials }}</span>
      </span>
      <div class="flex min-w-[220px] flex-1 flex-col gap-3">
        <p class="text-muted text-sm">{{ t('account.photo.text') }}</p>
        <div class="flex flex-wrap gap-2">
          <PButton size="sm" icon="upload" :loading="uploading" @click="input?.click()">
            {{ t('account.photo.upload') }}
          </PButton>
          <PButton
            variant="outline"
            size="sm"
            :disabled="!hasImage"
            :loading="removing"
            @click="confirmRemove = true"
          >
            {{ t('account.photo.remove') }}
          </PButton>
        </div>
        <input
          ref="input"
          type="file"
          accept="image/jpeg,image/png"
          class="hidden"
          :aria-label="t('account.photo.file')"
          data-testid="photo-file"
          @change="onPick"
        />
      </div>
    </div>
    <ImageCropDialog
      :open="cropping"
      :file="file"
      :busy="uploading"
      @update:open="cropping = $event"
      @crop="$emit('upload', $event)"
    />
    <PrognoModal
      v-model:open="confirmRemove"
      destructive
      :title="t('account.photo.confirm.title')"
      :description="t('account.photo.confirm.text')"
      :confirm-label="t('account.photo.confirm.action')"
      @confirm="$emit('remove')"
    />
  </CommunityCard>
</template>
