<script setup lang="ts">
// Only rendered in `beta` mode (vite build --mode beta). Minimal styling: tokens arrive in F1/F2.
const isBeta = import.meta.env.MODE === 'beta'
</script>

<template>
  <div v-if="isBeta" class="beta-banner" role="status">
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"
      />
    </svg>
    <span><b>Estás utilizando PrognoSports Beta.</b> Puede haber errores.</span>
  </div>
</template>

<style scoped>
.beta-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  background: var(--color-info-tint);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-info-fg);
}
</style>
