<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import type { SeriesToken } from '@/composables/useHighlight'

withDefaults(
  defineProps<{
    player: { id: string; name: string }
    pressed?: boolean
    color?: SeriesToken
    /** «Tú»: always on, cannot be toggled. */
    locked?: boolean
  }>(),
  { pressed: false, color: 'series-rest', locked: false },
)
const emit = defineEmits<{ toggle: [id: string] }>()

const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    :aria-pressed="locked || pressed"
    :aria-disabled="locked || undefined"
    :aria-label="locked ? t('data.highlight.locked', { name: player.name }) : undefined"
    class="focus-visible:outline-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
    :class="
      locked || pressed
        ? 'bg-tint text-tint-fg ring-1 ring-current'
        : 'bg-surface-muted text-body hover:bg-tint-hover'
    "
    @click="!locked && emit('toggle', player.id)"
  >
    <!-- The dot only repeats what the chart legend says: the state is in aria-pressed and the check. -->
    <span
      aria-hidden="true"
      class="size-3 rounded-full"
      :class="{
        'bg-series-you': color === 'series-you',
        'bg-series-2': color === 'series-2',
        'bg-series-3': color === 'series-3',
        'bg-series-4': color === 'series-4',
        'bg-series-5': color === 'series-5',
        'bg-series-6': color === 'series-6',
        'bg-series-rest': color === 'series-rest',
      }"
    />
    {{ player.name }}
    <PIcon v-if="locked || pressed" name="check" :size="16" />
  </button>
</template>
