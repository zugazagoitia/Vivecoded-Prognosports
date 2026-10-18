<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFlag } from '@/flags'
import { findOutline } from '@/lib/f1Media/circuitOutlines'
import { trackIconUrl } from '@/lib/f1Media/trackIcons'

/**
 * Circuit outline (issue 223). Default: open-licence outline (bacinger/f1-circuits, MIT) drawn as
 * our own SVG in theme colours. With VITE_FF_F1_TRACK_ICONS: F1's track icon, falling back to the
 * open outline if the image fails. Load it lazily (defineAsyncComponent).
 */
const props = defineProps<{
  circuit: string
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}>()
const { t } = useI18n()
const f1Icons = useFlag('F1_TRACK_ICONS')

const outline = computed(() => findOutline(props.latitude, props.longitude))
const failed = ref(false)
watch(
  () => props.country,
  () => (failed.value = false),
)
const iconUrl = computed(() => (f1Icons.value ? trackIconUrl(props.country) : undefined))
const showIcon = computed(() => iconUrl.value != null && !failed.value)
const label = computed(() => t('f1Media.circuitOutline.label', { circuit: props.circuit }))
</script>

<template>
  <img
    v-if="showIcon"
    :src="iconUrl"
    :alt="label"
    width="480"
    height="270"
    loading="lazy"
    decoding="async"
    class="mx-auto block h-auto max-h-48 w-full max-w-full object-contain"
    data-testid="circuit-outline-f1"
    @error="failed = true"
  />
  <svg
    v-else-if="outline"
    role="img"
    :aria-label="label"
    :viewBox="`0 0 ${outline.w} ${outline.h}`"
    class="text-primary mx-auto block h-auto max-h-48 w-full max-w-full"
    data-testid="circuit-outline-open"
  >
    <path
      :d="outline.d"
      fill="none"
      stroke="currentColor"
      stroke-width="5"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
</template>
