<script setup lang="ts">
// Colour-scale legend: sequential ramp (seq-1…7, single hue) or diverging (div-neg / mid / pos).
defineProps<{ kind: 'seq' | 'div' }>()
const SEQ = [1, 2, 3, 4, 5, 6, 7]
</script>

<template>
  <div class="ch-scale">
    <template v-if="kind === 'seq'">
      <span>Menos puntos</span>
      <span class="ch-ramp" aria-hidden="true">
        <span v-for="n in SEQ" :key="n" :class="`ch-seq-${n}`" />
      </span>
      <span>Más puntos</span>
    </template>
    <template v-else>
      <span class="ch-scale-item"
        ><i class="ch-sw ch-div-neg" aria-hidden="true" />Gana el rival</span
      >
      <span class="ch-scale-item"><i class="ch-sw ch-div-mid" aria-hidden="true" />Empate</span>
      <span class="ch-scale-item"><i class="ch-sw ch-div-pos" aria-hidden="true" />Ganas tú</span>
    </template>
  </div>
</template>

<style>
.ch-scale {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-text-muted);
}
.ch-scale-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ch-ramp {
  display: inline-flex;
  overflow: hidden;
  border-radius: 4px;
}
.ch-ramp span {
  width: 24px;
  height: 10px;
}
.ch-sw {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  outline: 1px solid var(--color-border);
}
.ch-seq-1 {
  background: var(--color-seq-1);
}
.ch-seq-2 {
  background: var(--color-seq-2);
}
.ch-seq-3 {
  background: var(--color-seq-3);
}
.ch-seq-4 {
  background: var(--color-seq-4);
}
.ch-seq-5 {
  background: var(--color-seq-5);
}
.ch-seq-6 {
  background: var(--color-seq-6);
}
.ch-seq-7 {
  background: var(--color-seq-7);
}
.ch-div-neg {
  background: var(--color-div-neg);
}
.ch-div-mid {
  background: var(--color-div-mid);
}
.ch-div-pos {
  background: var(--color-div-pos);
}
</style>
