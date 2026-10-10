<script setup lang="ts">
export interface ToastAction {
  label: string
  onClick: () => void
}
defineProps<{
  kind: 'success' | 'error' | 'info'
  title: string
  description?: string
  action?: ToastAction
}>()
const icons = { success: 'check_circle', error: 'error', info: 'content_copy' } as const
</script>

<template>
  <div
    class="toast-card"
    :class="`toast-${kind}`"
    :role="kind === 'error' ? 'alert' : 'status'"
    :aria-live="kind === 'error' ? 'assertive' : 'polite'"
    aria-atomic="true"
  >
    <span class="material-symbols-outlined toast-icon" aria-hidden="true">{{ icons[kind] }}</span>
    <div class="toast-body">
      <strong class="toast-title">{{ title }}</strong>
      <span v-if="description" class="toast-desc">{{ description }}</span>
      <button v-if="action" type="button" class="toast-action" @click="action.onClick">
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-card {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  width: 22rem;
  max-width: calc(100vw - 2rem);
  padding: 0.875rem 1rem;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-heading);
  box-shadow: var(--shadow-lg);
}
.toast-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.toast-title {
  font-weight: 700;
}
.toast-desc {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}
.toast-icon {
  font-size: 1.5rem;
}
.toast-success .toast-icon {
  color: var(--color-ok);
}
.toast-error .toast-icon {
  color: var(--color-err);
}
.toast-info .toast-icon {
  color: var(--color-link);
}
.toast-action {
  align-self: flex-start;
  margin-top: 0.25rem;
  font-weight: 600;
  text-decoration: underline;
}
@media (prefers-reduced-motion: reduce) {
  .toast-card {
    transition: none;
    animation: none;
  }
}
</style>
