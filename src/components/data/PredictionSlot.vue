<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import { formatOrdinal } from '@/utils/numbers'

import type { SlotDriver, SlotDrop } from './types'

const props = withDefaults(
  defineProps<{
    position: number
    driver?: SlotDriver | null
    selected?: boolean
    canMoveUp?: boolean
    canMoveDown?: boolean
    /** Show the drag-and-drop wording of the empty state (desktop). */
    draggable?: boolean
  }>(),
  { driver: null, selected: false, canMoveUp: true, canMoveDown: true, draggable: true },
)
const emit = defineEmits<{
  select: []
  remove: []
  moveUp: []
  moveDown: []
  drop: [payload: SlotDrop]
}>()

const { t } = useI18n()
const over = ref(false)

const place = computed(() => formatOrdinal(props.position))
const label = computed(() =>
  props.driver
    ? t('data.slot.filled', { place: place.value, driver: props.driver.name })
    : t('data.slot.empty', { place: place.value }),
)

// Every action also works from the keyboard: Enter/Space select, Delete removes, Alt+arrows reorder.
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('select')
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && props.driver) {
    e.preventDefault()
    emit('remove')
  } else if (e.altKey && e.key === 'ArrowUp' && props.driver && props.canMoveUp) {
    e.preventDefault()
    emit('moveUp')
  } else if (e.altKey && e.key === 'ArrowDown' && props.driver && props.canMoveDown) {
    e.preventDefault()
    emit('moveDown')
  }
}

// Native HTML5 drag and drop (vue-draggable-plus is not a dependency yet).
function onDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/x-slot', String(props.position))
}
function onDrop(e: DragEvent) {
  over.value = false
  const from = e.dataTransfer?.getData('text/x-slot')
  const code = e.dataTransfer?.getData('text/x-driver')
  if (from) emit('drop', { fromPosition: Number(from) })
  else if (code) emit('drop', { driverCode: code })
}

const btn =
  'focus-visible:outline-focus-ring inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40'
</script>

<template>
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- drop target; every action also has keyboard buttons -->
  <div
    :data-position="position"
    :data-selected="selected"
    :draggable="draggable && !!driver"
    class="flex min-h-14 items-center gap-1 rounded-lg border-2 pr-1"
    :class="[
      selected || over ? 'border-brand-500 bg-tint' : 'border-border bg-surface',
      !driver && 'border-dashed',
    ]"
    @dragstart="onDragStart"
    @dragover.prevent="over = true"
    @dragleave="over = false"
    @drop.prevent="onDrop"
  >
    <div
      role="button"
      tabindex="0"
      :aria-label="label"
      :aria-pressed="selected"
      class="focus-visible:outline-focus-ring flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg pl-3 focus-visible:outline-2 focus-visible:outline-offset-2"
      @click="emit('select')"
      @keydown="onKeydown"
    >
      <span class="text-heading w-8 shrink-0 text-sm font-semibold tabular-nums">{{ place }}</span>
      <template v-if="driver">
        <span
          aria-hidden="true"
          class="h-8 w-1 shrink-0 rounded-full"
          :class="!driver.teamColor && 'bg-series-rest'"
          :style="driver.teamColor ? { backgroundColor: driver.teamColor } : undefined"
        />
        <span class="text-heading min-w-0 flex-1 truncate text-sm font-medium">
          {{ driver.name }}
        </span>
        <PIcon v-if="draggable" name="grip-vertical" class="text-muted" />
      </template>
      <span v-else class="text-muted text-sm">
        {{ draggable ? t('data.slot.emptyDrag') : t('data.slot.emptyPrompt') }}
      </span>
    </div>
    <template v-if="driver">
      <button
        type="button"
        :class="btn"
        :disabled="!canMoveUp"
        :aria-label="t('data.slot.moveUp', { driver: driver.name })"
        @click="emit('moveUp')"
      >
        <PIcon name="chevron-down" class="rotate-180" />
      </button>
      <button
        type="button"
        :class="btn"
        :disabled="!canMoveDown"
        :aria-label="t('data.slot.moveDown', { driver: driver.name })"
        @click="emit('moveDown')"
      >
        <PIcon name="chevron-down" />
      </button>
      <button
        type="button"
        :class="btn"
        :aria-label="t('data.slot.remove', { driver: driver.name, place })"
        @click="emit('remove')"
      >
        <PIcon name="xmark" />
      </button>
    </template>
  </div>
</template>
