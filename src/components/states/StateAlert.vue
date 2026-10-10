<script setup lang="ts">
import PIcon from '@/components/ui/PIcon.vue'
import { iconFor } from '@/components/ui/icons'

/** Aviso en pantalla (`.alert` del tablero). Sustituible por la Alert de F3 cuando exista. */
withDefaults(
  defineProps<{
    kind?: 'info' | 'ok' | 'warn' | 'err' | 'brand'
    /** Nombre Material del icono. */
    icon?: string
    title?: string
  }>(),
  { kind: 'info', icon: 'info', title: undefined },
)
</script>

<template>
  <div class="state-alert" :data-kind="kind" role="status">
    <PIcon :name="iconFor(icon)" :size="20" />
    <p>
      <b v-if="title">{{ title }}</b>
      <template v-if="title && $slots.default">{{ ' ' }}</template>
      <slot />
    </p>
  </div>
</template>

<style scoped>
.state-alert {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
.state-alert :deep(.p-icon) {
  margin-top: 0.125rem;
}
b {
  font-weight: 700;
}
[data-kind='info'] {
  background: var(--color-info-tint);
  color: var(--color-info-fg);
}
[data-kind='ok'] {
  background: var(--color-ok-tint);
  color: var(--color-ok-fg);
}
[data-kind='warn'] {
  background: var(--color-warn-tint);
  color: var(--color-warn-fg);
}
[data-kind='brand'] {
  background: var(--color-tint);
  color: var(--color-tint-fg);
}
[data-kind='err'] {
  background: var(--color-err-tint);
  color: var(--color-err-fg);
}
</style>
