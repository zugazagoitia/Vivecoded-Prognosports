<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
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
      <PButton
        variant="ghost"
        :disabled="saving"
        :class="
          variant === 'inverted'
            ? 'bg-transparent text-inherit hover:bg-white/15 hover:text-inherit dark:hover:bg-gray-900/10 dark:hover:text-inherit'
            : ''
        "
        @click="emit('discard')"
      >
        {{ t('data.saveBar.discard') }}
      </PButton>
      <PButton :loading="saving" @click="emit('save')">
        {{ t('data.saveBar.save') }}
      </PButton>
    </div>
  </section>
</template>
