<script setup lang="ts">
import { computed } from 'vue'
import PTag from './PTag.vue'
import { focusRing } from './styles'
import { textColorFor } from './textColor'

const props = defineProps<{
  /** Car number. */
  number: number | string
  name: string
  team: string
  /** Team colour (CSS colour that comes from data). */
  color: string
  /** Three-letter code shown as a tag. */
  code?: string
  /** Renders a toggle button (`aria-pressed`) instead of a static row. */
  selectable?: boolean
  selected?: boolean
}>()
defineEmits<{ select: [] }>()

const numberText = computed(() =>
  textColorFor(props.color) === 'white' ? 'text-white' : 'text-black',
)
</script>

<template>
  <component
    :is="selectable ? 'button' : 'div'"
    :type="selectable ? 'button' : undefined"
    :aria-pressed="selectable ? !!selected : undefined"
    :class="[
      'bg-surface ring-border flex min-h-12 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left ring-1',
      selectable ? ['hover:ring-focus-ring min-h-12 cursor-pointer md:min-h-12', focusRing] : '',
      selected ? 'bg-tint ring-focus-ring' : '',
    ]"
    @click="selectable && $emit('select')"
  >
    <span
      class="h-8 w-1 flex-none rounded-full"
      :style="{ backgroundColor: color }"
      aria-hidden="true"
    />
    <span
      :class="[
        'inline-flex h-7 min-w-7 flex-none items-center justify-center rounded-sm px-1 text-[13px] font-bold tabular-nums',
        numberText,
      ]"
      :style="{ backgroundColor: color }"
    >
      {{ number }}
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="text-heading truncate text-sm leading-5 font-semibold">{{ name }}</span>
      <span class="text-muted truncate text-xs leading-4">{{ team }}</span>
    </span>
    <PTag v-if="code" color="gray">{{ code }}</PTag>
  </component>
</template>
