<script setup lang="ts">
import { ref } from 'vue'
import { useField, useForm } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import { imageFileSchema } from '@/lib/community-settings'
import { toTypedSchema } from '@/lib/zod-form'
import CommunityAvatar from './CommunityAvatar.vue'
import CommunityCard from './CommunityCard.vue'
import ImageCropDialog from './ImageCropDialog.vue'

/**
 * «Imagen» block of the settings (H6): current picture or initials, «Subir imagen» (file picker ->
 * square crop -> `upload`) and «Quitar imagen» (only when `hasImage`). The file is validated with
 * VeeValidate + Zod (`imageFileSchema`: image type, readable size) before the crop dialog opens.
 *
 * Props: `id`, `name`, `hasImage`, `uploading`, `removing`, `loading`, `error`. Emits `upload`
 * (cropped Blob), `remove` and `retry`. The parent closes the dialog through `v-model:cropping`.
 */
defineProps<{
  id: number | string
  name: string
  hasImage?: boolean | null
  version?: number
  uploading?: boolean
  removing?: boolean
  loading?: boolean
  error?: unknown
}>()
const cropping = defineModel<boolean>('cropping', { default: false })
defineEmits<{ upload: [blob: Blob]; remove: []; retry: [] }>()
const { t } = useI18n()

const input = ref<HTMLInputElement>()
const { errors, validate, resetForm } = useForm({
  validationSchema: toTypedSchema(imageFileSchema),
})
const { value: file } = useField<File | undefined>('file')

async function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  file.value = el.files?.[0]
  el.value = ''
  const result = await validate()
  cropping.value = result.valid
}
function onClose(open: boolean) {
  cropping.value = open
  if (!open) resetForm()
}
</script>

<template>
  <CommunityCard
    :title="t('communitySettings.image.title')"
    :loading="loading"
    :error="error"
    :what="t('communitySettings.error.image')"
    @retry="$emit('retry')"
  >
    <div class="flex flex-wrap items-center gap-5">
      <CommunityAvatar :id="id" :name="name" :has-image="hasImage" :version="version" :size="96" />
      <div class="flex min-w-[220px] flex-1 flex-col gap-3">
        <p class="text-muted text-sm">{{ t('communitySettings.image.text') }}</p>
        <div class="flex flex-wrap gap-2">
          <PButton size="sm" icon="upload" :loading="uploading" @click="input?.click()">
            {{ t('communitySettings.image.upload') }}
          </PButton>
          <PButton
            variant="outline"
            size="sm"
            :disabled="!hasImage"
            :loading="removing"
            @click="$emit('remove')"
          >
            {{ t('communitySettings.image.remove') }}
          </PButton>
        </div>
        <input
          ref="input"
          type="file"
          accept="image/*"
          class="hidden"
          :aria-label="t('communitySettings.image.file')"
          data-testid="image-file"
          @change="onPick"
        />
        <p v-if="errors.file" role="alert" class="text-err text-sm">
          {{ t(errors.file) }}
        </p>
      </div>
    </div>
    <ImageCropDialog
      :open="cropping"
      :file="file"
      :busy="uploading"
      @update:open="onClose"
      @crop="$emit('upload', $event)"
    />
  </CommunityCard>
</template>
