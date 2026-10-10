<script setup lang="ts">
import { FLAG_DEFS, FLAG_NAMES, envKey, isEnabled, setFlagOverride } from './index'
const PANEL_LABEL = 'Feature flags'
</script>

<template>
  <aside class="flag-panel" :aria-label="PANEL_LABEL">
    <ul>
      <li v-for="name in FLAG_NAMES" :key="name">
        <button
          type="button"
          role="switch"
          :aria-checked="isEnabled(name)"
          :aria-label="FLAG_DEFS[name].label"
          @click="setFlagOverride(name, !isEnabled(name))"
        >
          <strong>{{ FLAG_DEFS[name].label }}</strong>
          <code>{{ envKey(name) }}</code>
          <span>{{ isEnabled(name) ? 'Activa' : 'Apagada' }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.flag-panel {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 1000;
  max-height: 60vh;
  overflow: auto;
  padding: 0.5rem;
  background: Canvas;
  color: CanvasText;
  border: 1px solid currentcolor;
  border-radius: 0.5rem;
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
button {
  display: grid;
  width: 100%;
  gap: 0.125rem;
  padding: 0.375rem;
  text-align: left;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}
button[aria-checked='true'] span {
  font-weight: 700;
}
code {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
}
</style>
