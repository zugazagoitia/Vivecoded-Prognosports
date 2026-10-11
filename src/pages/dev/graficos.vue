<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useHighlight } from '@/composables/useHighlight'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'
import ScaleLegend from '@/components/charts/ScaleLegend.vue'
import { cumulate, type ChartGp, type ChartUser } from '@/components/charts/model'

// Development-only showcase of the F5 chart language (unlisted, noindex via /dev/* header).
definePage({ meta: { layout: 'empty', title: 'route.graficos' } })

// The chart code lives in its own async chunk (never in the initial bundle).
const ChartCard = defineAsyncComponent(() => import('@/components/charts/ChartCard.vue'))

const gps: ChartGp[] = [
  ['AUS', 'Australia'],
  ['CHN', 'China'],
  ['JPN', 'Japón'],
  ['BHR', 'Baréin'],
  ['KSA', 'Arabia Saudí'],
  ['MIA', 'Miami'],
  ['IMO', 'Emilia-Romaña'],
  ['MON', 'Mónaco'],
  ['ESP', 'España'],
  ['CAN', 'Canadá'],
  ['AUT', 'Austria'],
  ['GBR', 'Gran Bretaña'],
  ['HUN', 'Hungría'],
  ['BEL', 'Bélgica'],
  ['NED', 'Países Bajos'],
  ['ITA', 'Italia'],
  ['AZE', 'Azerbaiyán'],
].map(([code, name]) => ({ code: code as string, name: name as string }))

// Deterministic sample data (same on every run: visual snapshots depend on it).
function rng(seed: number) {
  let s = seed
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
}
const names = [
  'Alberto',
  'Marta',
  'Iker',
  'Lucía',
  'Pablo',
  'Nerea',
  'Sergio',
  'Ana',
  'Dani',
  'Carla',
  'Hugo',
  'Elena',
]
const perGp: ChartUser[] = names.map((name, k) => {
  const r = rng(k * 97 + 11)
  const skill = 28 + ((k * 7) % 9) * 1.5
  return {
    id: k === 0 ? 'me' : `u${k}`,
    name,
    values: gps.map(() => Math.round(skill + r() * 18 - 4)),
  }
})
const me = 'me'
const modes = computed(() => [
  { id: 'cum', label: 'Acumulado', kind: 'line' as const, users: cumulate(perGp) },
  { id: 'gp', label: 'Por GP', kind: 'bar' as const, users: perGp },
])

const candidates = perGp.filter((u) => u.id !== me)
const { highlighted, toggle, isOn, set } = useHighlight(me)
set(['u1', 'u2', 'u3', 'u4'])

// Small heatmap sample on the sequential scale: the value is printed, not only coloured.
const heat = [3, 9, 14, 20, 26, 31, 38, 42, 17, 5, 29, 35]
function seqStep(v: number): number {
  return Math.min(7, Math.max(1, Math.ceil(v / 6)))
}
</script>

<template>
  <div class="pg-main col g24">
    <header class="row g16 demo-head">
      <h1 class="t-title">Gráficos</h1>
      <ThemeSwitch />
    </header>

    <ChartCard
      title="Clasificación acumulada"
      subtitle="Amigos del paddock · 17 Grandes Premios · pulsa un GP del eje para fijarlo"
      :gps="gps"
      :modes="modes"
      :highlight="highlighted"
      :me="me"
    >
      <template #filters>
        <button
          v-for="u in candidates"
          :key="u.id"
          type="button"
          class="demo-chip"
          :aria-pressed="isOn(u.id)"
          @click="toggle(u.id)"
        >
          {{ u.name }}
        </button>
      </template>
    </ChartCard>

    <section class="col g12" aria-labelledby="escalas">
      <h2 id="escalas" class="t-header">Escalas</h2>
      <ScaleLegend kind="seq" />
      <div class="demo-heat">
        <span v-for="(v, i) in heat" :key="i" :class="`ch-seq-${seqStep(v)}`"
          ><b class="tn">{{ v }}</b></span
        >
      </div>
      <ScaleLegend kind="div" />
    </section>
  </div>
</template>

<style>
.demo-chip {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border-input);
  border-radius: 999px;
  font-size: 14px;
  color: var(--color-text-body);
  cursor: pointer;
}
.demo-chip[aria-pressed='true'] {
  background: var(--color-tint);
  border-color: transparent;
  color: var(--color-tint-fg);
  font-weight: 700;
}
.demo-chip:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
@media (pointer: coarse) {
  .demo-chip {
    min-height: 44px;
  }
}
.demo-heat {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 2px;
  max-width: 420px;
}
.demo-head {
  justify-content: space-between;
}
.demo-heat span {
  padding: 6px 0;
  border-radius: 4px;
  text-align: center;
  font-size: 12px;
}
/* The figure sits on a neutral pill so contrast never depends on the ramp step. */
.demo-heat b {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text-heading);
  font-weight: 600;
}
</style>
