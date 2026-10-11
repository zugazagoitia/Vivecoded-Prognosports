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
    /** Overrides the «N cambios» text (G3: «Faltan 3 pilotos» / «Listo para guardar»). */
    message?: string
    /** Texts of the two buttons (G3: «Vaciar», «Guardar pronóstico»). */
    discardLabel?: string
    saveLabel?: string
    /** Renders even with `count = 0` (G3 mobile: the bar is always there). */
    always?: boolean
    /** `false` disables Save (G3: until the N drivers are chosen). */
    canSave?: boolean
    /** On narrow screens the message takes a row and the buttons share the next one. */
    stack?: boolean
  }>(),
  {
    saving: false,
    variant: 'inverted',
    position: 'fixed',
    message: undefined,
    discardLabel: undefined,
    saveLabel: undefined,
    canSave: true,
    always: false,
    stack: false,
  },
)
const emit = defineEmits<{ save: []; discard: [] }>()

const { t } = useI18n()
</script>

<template>
  <section
    v-if="count > 0 || always"
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
    <p
      :class="stack && 'max-[480px]:basis-[calc(100%-2rem)]'"
      class="min-w-0 flex-1 text-sm font-medium"
      aria-live="polite"
    >
      {{ message ?? t('data.saveBar.changes', { n: formatNumber(count) }, count) }}
    </p>
    <div class="flex gap-2" :class="stack && 'max-[480px]:w-full max-[480px]:[&>*]:flex-1'">
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
        {{ discardLabel ?? t('data.saveBar.discard') }}
      </PButton>
      <PButton :loading="saving" :disabled="!canSave" @click="emit('save')">
        {{ saveLabel ?? t('data.saveBar.save') }}
      </PButton>
    </div>
  </section>
</template>
