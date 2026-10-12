<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { measureBottomInset } from './bottomInset'
import { FLAG_DEFS, FLAG_NAMES, envKey, isEnabled, setFlagOverride } from './index'

// Reviewer-only tool (never in production): texts stay here on purpose.
const PANEL_LABEL = 'Feature flags'
const OPEN_KEY = 'prognosports.flagPanel.open'

function readOpen(): boolean {
  try {
    return globalThis.localStorage?.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

const open = ref(readOpen())
watch(open, (v) => {
  try {
    globalThis.localStorage?.setItem(OPEN_KEY, v ? '1' : '0')
  } catch {
    /* storage unavailable: the state just isn't persisted */
  }
})

// Room taken by the bottom bars (tab bar, sticky save bar): the panel always sits above them.
const inset = ref(0)
const root = ref<HTMLElement | null>(null)
let frame = 0
function update() {
  frame = 0
  inset.value = measureBottomInset(document, window.innerHeight, root.value?.offsetHeight ?? 0)
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(update)
}
let observer: MutationObserver | undefined
onMounted(() => {
  update()
  window.addEventListener('scroll', schedule, { passive: true, capture: true })
  window.addEventListener('resize', schedule)
  observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', schedule, { capture: true })
  window.removeEventListener('resize', schedule)
  observer?.disconnect()
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <aside
    ref="root"
    class="flag-panel"
    :style="{ '--flag-inset': `${inset}px` }"
    :aria-label="PANEL_LABEL"
  >
    <ul v-if="open" id="flag-panel-list" class="list">
      <li v-for="name in FLAG_NAMES" :key="name">
        <button
          type="button"
          role="switch"
          :aria-checked="isEnabled(name)"
          :aria-label="FLAG_DEFS[name].label"
          class="item"
          @click="setFlagOverride(name, !isEnabled(name))"
        >
          <strong>{{ FLAG_DEFS[name].label }}</strong>
          <code>{{ envKey(name) }}</code>
          <span>{{ isEnabled(name) ? 'Activa' : 'Apagada' }}</span>
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="bubble"
      :aria-expanded="open"
      aria-controls="flag-panel-list"
      :aria-label="PANEL_LABEL"
      @click="open = !open"
    >
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
        <path d="M3 1h1.5v14H3zM5 2h8l-2 3 2 3H5z" />
      </svg>
    </button>
  </aside>
</template>

<style scoped>
.flag-panel {
  position: fixed;
  right: 0.75rem;
  /* --flag-inset: measured height of the bottom bars (tab bar + safe area, sticky save bar). */
  bottom: calc(var(--flag-inset, 0px) + 0.75rem);
  /* Above the tab bar (z-40) but below sheets and dialogs (z-50): never covers their controls. */
  z-index: 45;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  max-width: calc(100vw - 1.5rem);
  pointer-events: none;
}
@media (max-width: 900px) {
  .flag-panel {
    right: 0.25rem;
    bottom: calc(var(--flag-inset, 0px) + 0.5rem);
  }
  .flag-panel .bubble {
    width: 2.25rem;
    height: 2.25rem;
    opacity: 0.9;
  }
}
.flag-panel > * {
  pointer-events: auto;
}
.bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  color: var(--color-white);
  background: var(--color-brand-accent-700);
  border: 0;
  border-radius: 9999px;
  box-shadow: var(--shadow-lg, 0 4px 12px rgb(0 0 0 / 25%));
  cursor: pointer;
}
.bubble:hover {
  background: var(--color-brand-accent-800);
}
.bubble:focus-visible,
.item:focus-visible {
  outline: 2px solid var(--color-link);
  outline-offset: 2px;
}
.list {
  margin: 0;
  padding: 0.25rem;
  width: 16rem;
  max-width: 100%;
  max-height: min(50vh, calc(100dvh - var(--flag-inset, 0px) - 5rem));
  overflow: auto;
  list-style: none;
  background: var(--color-surface);
  color: var(--color-text-body);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 0.5rem);
  box-shadow: var(--shadow-lg, 0 4px 12px rgb(0 0 0 / 25%));
}
.item {
  display: grid;
  width: 100%;
  min-height: 2.75rem;
  gap: 0.125rem;
  padding: 0.5rem;
  text-align: left;
  background: none;
  border: 0;
  border-radius: 0.375rem;
  color: inherit;
  cursor: pointer;
}
.item:hover {
  background: var(--color-surface-hover);
}
.item strong {
  color: var(--color-text-heading);
  font-size: 0.875rem;
}
.item span {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}
.item[aria-checked='true'] span {
  color: var(--color-text-heading);
  font-weight: 700;
}
code {
  color: var(--color-text-muted);
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}
</style>
