<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { useI18n } from 'vue-i18n'
import PButton from './PButton.vue'
import PIcon from './PIcon.vue'

defineProps<{
  title: string
  description?: string
  /** Destructive confirmation: warning icon, «Cancelar» + danger button. */
  destructive?: boolean
  confirmLabel?: string
  cancelLabel?: string
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()

function confirm() {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-gray-900/60" />
      <DialogContent
        v-bind="description ? {} : { 'aria-describedby': undefined }"
        class="bg-surface ring-card-ring fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-120 -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg shadow-lg ring-1 focus:outline-none"
      >
        <header class="border-border flex items-start gap-3 border-b px-5 py-4">
          <PIcon
            v-if="destructive"
            name="triangle-exclamation"
            :size="24"
            class="text-err mt-0.5"
          />
          <div class="min-w-0 flex-1">
            <DialogTitle class="text-heading text-xl leading-7 font-semibold">
              {{ title }}
            </DialogTitle>
            <DialogDescription v-if="description" class="text-muted mt-1 text-sm">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose as-child>
            <PButton
              variant="ghost"
              size="sm"
              icon="xmark"
              icon-only
              :aria-label="t('ui.close')"
              class="-mt-1 -mr-2"
            />
          </DialogClose>
        </header>
        <div class="overflow-y-auto px-5 py-4 text-sm">
          <slot />
        </div>
        <footer
          class="border-border flex flex-wrap items-center justify-end gap-3 border-t px-5 py-3"
        >
          <slot name="footer" :confirm="confirm">
            <DialogClose as-child>
              <PButton variant="outline">{{ cancelLabel ?? t('ui.cancel') }}</PButton>
            </DialogClose>
            <PButton :variant="destructive ? 'danger' : 'primary'" @click="confirm">
              {{ confirmLabel ?? t('ui.confirm') }}
            </PButton>
          </slot>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
