<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Esqueleto con el MISMO tamaño que el contenido final (sin saltos de diseño): alturas fijas
 * en rem que el contenido real respeta (`--skel-row`, `--skel-chart`). Los bloques son
 * decorativos (`aria-hidden`); la región anuncia «Cargando...» con `role="status"`.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'line' | 'avatar' | 'card' | 'table' | 'chart'
    /** Filas de la tabla (variant `table`). */
    rows?: number
    /** Líneas de texto (variant `line`). */
    lines?: number
  }>(),
  { variant: 'line', rows: 5, lines: 1 },
)
const { t } = useI18n()
const rowCount = computed(() => Math.max(1, props.rows))
const lineCount = computed(() => Math.max(1, props.lines))
</script>

<template>
  <div class="skeleton" :data-variant="variant" role="status" aria-busy="true">
    <span class="sr-only">{{ t('loading') }}</span>
    <div class="skeleton-body" aria-hidden="true">
      <template v-if="variant === 'line'">
        <div v-for="n in lineCount" :key="n" class="skel skel-line" />
      </template>
      <div v-else-if="variant === 'avatar'" class="skel-avatar-row">
        <div class="skel skel-avatar" />
        <div class="skel skel-line" />
      </div>
      <div v-else-if="variant === 'card'" class="skel skel-card" />
      <template v-else-if="variant === 'table'">
        <div v-for="n in rowCount" :key="n" class="skel-table-row">
          <div class="skel skel-avatar" />
          <div class="skel skel-line" />
          <div class="skel skel-cell" />
        </div>
      </template>
      <div v-else class="skel skel-chart" />
    </div>
  </div>
</template>

<style>
.skeleton {
  --skel-row: 3rem;
  --skel-chart: 16rem;
}
.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.skeleton[data-variant='table'] .skeleton-body {
  gap: 0;
}
.skel {
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    var(--color-surface-muted) 50%,
    var(--color-border) 75%
  );
  background-size: 200% 100%;
  border-radius: 0.25rem;
}
@media (prefers-reduced-motion: no-preference) {
  .skel {
    animation: skel-shimmer 1.4s linear infinite;
  }
}
@keyframes skel-shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
.skel-line {
  height: 1rem;
  flex: 1;
}
.skel-avatar {
  width: 2.5rem;
  height: 2.5rem;
  flex: none;
  border-radius: 50%;
}
.skel-avatar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: var(--skel-row);
}
.skel-card {
  height: 8rem;
  border-radius: 0.5rem;
}
.skel-table-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: var(--skel-row);
}
.skel-cell {
  width: 3rem;
  height: 1rem;
  flex: none;
}
.skel-chart {
  height: var(--skel-chart);
  border-radius: 0.5rem;
}
</style>
