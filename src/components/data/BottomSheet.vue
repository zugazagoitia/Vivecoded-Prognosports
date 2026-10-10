<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialogFocus } from '@/composables/useDialogFocus'

const props = withDefaults(
  defineProps<{
    open?: boolean
    title: string
    /** Show on every viewport (catalogue). By default it is mobile-only: desktop uses a popover. */
    always?: boolean
  }>(),
  { open: false, always: false },
)
const emit = defineEmits<{ close: []; 'update:open': [value: boolean] }>()

const { t } = useI18n()
const panel = ref<HTMLElement | null>(null)

function close() {
  emit('update:open', false)
  emit('close')
}
const { onKeydown } = useDialogFocus(panel, toRef(props, 'open'), close)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end" :class="{ 'md:hidden': !always }">
      <button
        type="button"
        tabindex="-1"
        :aria-label="t('data.sheet.close')"
        class="absolute inset-0 cursor-default bg-gray-900/45"
        @click="close"
      />
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- Escape and Tab handling of the dialog -->
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        class="bg-surface text-body relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl p-4 pt-0 shadow-lg"
        @keydown="onKeydown"
      >
        <button
          type="button"
          :aria-label="t('data.sheet.close')"
          class="focus-visible:outline-focus-ring group mx-auto flex h-11 w-full items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
          @click="close"
        >
          <span class="bg-border-input block h-1 w-10 rounded-full" />
        </button>
        <h2 class="text-heading mb-2 text-lg font-semibold">{{ title }}</h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
