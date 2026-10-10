<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialogFocus } from '@/composables/useDialogFocus'

// TODO(F3): replace with the F3 modal component once it lands.
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ stay: []; leave: [] }>()

const { t } = useI18n()
const panel = ref<HTMLElement | null>(null)
const { onKeydown } = useDialogFocus(panel, toRef(props, 'open'), () => emit('stay'))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-900/45" aria-hidden="true" />
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- Escape and Tab handling of the dialog -->
      <div
        ref="panel"
        role="alertdialog"
        aria-modal="true"
        :aria-label="t('data.leave.title')"
        aria-describedby="leave-body"
        tabindex="-1"
        class="bg-surface text-body relative w-full max-w-sm rounded-lg p-5 shadow-lg"
        @keydown="onKeydown"
      >
        <h2 class="text-heading mb-2 text-lg font-semibold">{{ t('data.leave.title') }}</h2>
        <p id="leave-body" class="mb-4 text-sm">{{ t('data.leave.body') }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="bg-primary text-on-primary hover:bg-primary-hover focus-visible:outline-focus-ring min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="emit('stay')"
          >
            {{ t('data.leave.stay') }}
          </button>
          <button
            type="button"
            class="text-heading hover:bg-surface-muted ring-border-input focus-visible:outline-focus-ring min-h-11 rounded-lg px-4 text-sm font-semibold ring-1 focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="emit('leave')"
          >
            {{ t('data.leave.leave') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
