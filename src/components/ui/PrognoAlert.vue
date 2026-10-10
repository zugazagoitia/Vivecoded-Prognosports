<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from './PButton.vue'
import PIcon from './PIcon.vue'
import type { IconName } from './icons'

export type AlertVariant = 'brand' | 'ok' | 'warn' | 'err' | 'info'

const props = withDefaults(
  defineProps<{
    variant?: AlertVariant
    /** Bold lead-in. */
    title: string
    dismissible?: boolean
  }>(),
  { variant: 'info' },
)
defineEmits<{ dismiss: [] }>()
const { t } = useI18n()

const styles: Record<AlertVariant, { box: string; icon: IconName }> = {
  brand: { box: 'bg-tint text-tint-fg', icon: 'circle-info' },
  ok: { box: 'bg-ok-tint text-ok-fg', icon: 'circle-check' },
  warn: { box: 'bg-warn-tint text-warn-fg', icon: 'triangle-exclamation' },
  err: { box: 'bg-err-tint text-err-fg', icon: 'circle-exclamation' },
  info: { box: 'bg-info-tint text-info-fg', icon: 'circle-info' },
}
const style = computed(() => styles[props.variant])
</script>

<template>
  <div
    :role="variant === 'err' || variant === 'warn' ? 'alert' : 'status'"
    :class="['flex items-start gap-3 rounded-sm px-4 py-3 text-sm leading-5', style.box]"
  >
    <PIcon :name="style.icon" :size="20" class="mt-0" />
    <div class="min-w-0 flex-1">
      <p class="font-bold">{{ title }}</p>
      <div v-if="$slots.default"><slot /></div>
    </div>
    <PButton
      v-if="dismissible"
      variant="ghost"
      size="sm"
      icon="xmark"
      icon-only
      :aria-label="t('ui.alert.dismiss')"
      class="-my-1 -mr-2"
      @click="$emit('dismiss')"
    />
  </div>
</template>
