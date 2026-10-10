<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

withDefaults(defineProps<{ variant?: 'primary' | 'outline' | 'ghost'; to?: RouteLocationRaw }>(), {
  variant: 'primary',
  to: undefined,
})
</script>

<template>
  <RouterLink v-if="to" :to="to" class="state-action" :data-variant="variant"><slot /></RouterLink>
  <button v-else type="button" class="state-action" :data-variant="variant"><slot /></button>
</template>

<style>
.state-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.state-action[data-variant='primary'] {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.state-action[data-variant='primary']:hover {
  background: var(--color-primary-hover);
}
.state-action[data-variant='outline'] {
  background: transparent;
  color: var(--color-tint-fg);
  border-color: var(--color-border-input);
}
.state-action[data-variant='outline']:hover,
.state-action[data-variant='ghost']:hover {
  background: var(--color-surface-hover);
}
.state-action[data-variant='ghost'] {
  background: transparent;
  color: var(--color-tint-fg);
}
.state-action:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
</style>
