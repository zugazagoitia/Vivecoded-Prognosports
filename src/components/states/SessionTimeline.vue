<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SessionState } from './sessionState'

defineProps<{ state: SessionState }>()
const { t } = useI18n()
const STEPS: SessionState[] = ['open', 'closed', 'scored']
const ORDER: Record<SessionState, number> = { open: 0, closed: 1, scored: 2 }
</script>

<template>
  <ol class="tl" :aria-label="t('states.session.timeline.label')">
    <li
      v-for="step in STEPS"
      :key="step"
      class="tp"
      :class="{ done: ORDER[step] < ORDER[state], now: step === state }"
      :aria-current="step === state ? 'step' : undefined"
    >
      {{ t(`states.session.timeline.${step}`) }}
    </li>
  </ol>
</template>

<style scoped>
.tl {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-left: 1.5rem;
  list-style: none;
  font-size: 0.875rem;
  color: var(--color-body);
}
.tl::before {
  content: '';
  position: absolute;
  left: 0.4375rem;
  top: 0.375rem;
  bottom: 0.375rem;
  width: 2px;
  background: var(--color-border);
}
.tp {
  position: relative;
}
.tp::before {
  content: '';
  position: absolute;
  left: -1.4375rem;
  top: 0.3125rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-border-input);
}
.tp.done::before {
  background: var(--color-ok);
  border-color: var(--color-ok);
}
.tp.now {
  font-weight: 600;
}
.tp.now::before {
  background: var(--color-focus-ring);
  border-color: var(--color-focus-ring);
  box-shadow: 0 0 0 4px var(--color-tint);
}
</style>
