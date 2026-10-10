<script setup lang="ts" generic="T extends string">
// Compact segmented control used by ChartCard (modes, chart/table). Toggle buttons with aria-pressed.
defineProps<{ options: { id: T; label: string }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="ch-seg" role="group" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.id"
      type="button"
      class="ch-seg-btn"
      :aria-pressed="model === o.id"
      @click="model = o.id"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style>
.ch-seg {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border-radius: 8px;
  background: var(--color-surface-muted);
}
.ch-seg-btn {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
}
.ch-seg-btn[aria-pressed='true'] {
  background: var(--color-surface);
  color: var(--color-text-heading);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
.ch-seg-btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 1px;
}
@media (pointer: coarse) {
  .ch-seg-btn {
    min-height: 44px;
  }
}
@media (forced-colors: active) {
  .ch-seg-btn[aria-pressed='true'] {
    outline: 2px solid;
  }
}
</style>
