<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import PRangeInput from '@/components/ui/PRangeInput.vue'
import { CROP_OUTPUT, cropRect } from '@/lib/community-settings'

/**
 * Square crop of a chosen image before uploading it (req. 3.3). The picture is drawn on a canvas;
 * «Zoom» and the two position sliders move the square (keyboard accessible, no drag needed).
 * «Recortar y subir» emits `crop` with a JPEG `Blob` of 512 x 512 px (far below the 2 MB limit).
 *
 * Props: `file` (chosen image, undefined = closed), `busy` (upload in progress). Model `open`.
 * Emits `crop` (Blob).
 */
const props = defineProps<{ file?: File; busy?: boolean }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ crop: [blob: Blob] }>()
const { t } = useI18n()

const PREVIEW = 240
const canvas = ref<HTMLCanvasElement>()
const image = ref<HTMLImageElement>()
const zoom = ref(1)
const x = ref(0)
const y = ref(0)
const error = ref('')
let url: string | undefined

function release() {
  if (url) URL.revokeObjectURL(url)
  url = undefined
}

watch(
  () => [open.value, props.file] as const,
  ([isOpen, file]) => {
    release()
    image.value = undefined
    zoom.value = 1
    x.value = 0
    y.value = 0
    error.value = ''
    if (!isOpen || !file) return
    url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      image.value = img
      void nextTick(draw)
    }
    img.onerror = () => (error.value = t('communitySettings.image.errors.load'))
    img.src = url
  },
  { immediate: true },
)

function paint(target: HTMLCanvasElement, side: number) {
  const img = image.value
  const ctx = target.getContext('2d')
  if (!img || !ctx) return false
  const r = cropRect(img.naturalWidth, img.naturalHeight, zoom.value, x.value / 100, y.value / 100)
  target.width = side
  target.height = side
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sw, 0, 0, side, side)
  return true
}
function draw() {
  if (canvas.value) paint(canvas.value, PREVIEW)
}
watch([zoom, x, y], draw)
onBeforeUnmount(release)

function confirm() {
  const out = document.createElement('canvas')
  if (!paint(out, CROP_OUTPUT)) return
  out.toBlob(
    (blob) => {
      if (blob) emit('crop', blob)
      else error.value = t('communitySettings.image.errors.encode')
    },
    'image/jpeg',
    0.9,
  )
}

const ready = computed(() => !!image.value)
</script>

<template>
  <PrognoModal
    v-model:open="open"
    :title="t('communitySettings.image.crop.title')"
    :description="t('communitySettings.image.crop.text')"
  >
    <div class="flex flex-col items-center gap-4">
      <PrognoAlert v-if="error" variant="err" :title="error" class="self-stretch" />
      <canvas
        ref="canvas"
        role="img"
        :aria-label="t('communitySettings.image.crop.preview')"
        :width="PREVIEW"
        :height="PREVIEW"
        class="ring-card-ring bg-surface-muted size-60 rounded-2xl ring-1"
      />
      <div class="flex w-full flex-col gap-1">
        <PRangeInput
          v-model="zoom"
          :label="t('communitySettings.image.crop.zoom')"
          :min="1"
          :max="3"
          :step="0.05"
          :disabled="!ready"
        />
        <PRangeInput
          v-model="x"
          :label="t('communitySettings.image.crop.horizontal')"
          :min="-100"
          :max="100"
          :disabled="!ready"
        />
        <PRangeInput
          v-model="y"
          :label="t('communitySettings.image.crop.vertical')"
          :min="-100"
          :max="100"
          :disabled="!ready"
        />
      </div>
    </div>
    <template #footer>
      <PButton variant="outline" @click="open = false">{{ t('ui.cancel') }}</PButton>
      <PButton :disabled="!ready" :loading="busy" @click="confirm">
        {{ t('communitySettings.image.crop.confirm') }}
      </PButton>
    </template>
  </PrognoModal>
</template>
