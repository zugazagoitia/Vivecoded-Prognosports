<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import { formatNumber } from '@/utils/numbers'

withDefaults(
  defineProps<{
    count: number
    saving?: boolean
    /** `inverted` = design-system bar; `surface` = non-inverted bar for mobile Pronosticar (G3). */
    variant?: 'inverted' | 'surface'
    /** `fixed` to the bottom of the viewport, or in the page flow (catalogue). */
    position?: 'fixed' | 'static'
  }>(),
  { saving: false, variant: 'inverted', position: 'fixed' },
)
const emit = defineEmits<{ save: []; discard: [] }>()

const { t } = useI18n()
</script>

<template>
  <!-- TODO(F3): swap the two plain buttons for the F3 button component. -->
  <section
    v-if="count > 0"
    :aria-label="t('data.saveBar.label')"
    :data-variant="variant"
    class="z-40 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg p-3 shadow-lg"
    :class="[
      position === 'fixed' ? 'fixed inset-x-4 bottom-4 mx-auto max-w-2xl' : 'relative',
      variant === 'inverted'
        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
        : 'bg-surface text-body ring-border ring-1',
    ]"
  >
    <PIcon name="pen-to-square" />
    <p class="min-w-0 flex-1 text-sm font-medium" aria-live="polite">
      {{ t('data.saveBar.changes', { n: formatNumber(count) }, count) }}
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        :disabled="saving"
        class="focus-visible:outline-focus-ring min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        :class="
          variant === 'inverted'
            ? 'hover:bg-white/15 dark:hover:bg-gray-900/10'
            : 'text-heading hover:bg-surface-muted'
        "
        @click="emit('discard')"
      >
        {{ t('data.saveBar.discard') }}
      </button>
      <button
        type="button"
        :disabled="saving"
        :aria-busy="saving"
        class="bg-primary text-on-primary hover:bg-primary-hover focus-visible:outline-focus-ring min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
        @click="emit('save')"
      >
        {{ saving ? t('data.saveBar.saving') : t('data.saveBar.save') }}
      </button>
    </div>
  </section>
</template>
