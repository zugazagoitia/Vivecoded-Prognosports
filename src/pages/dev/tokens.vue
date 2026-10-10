<script setup lang="ts">
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'

// Development-only showcase of the F1 tokens (unlisted, noindex). Literal class names so Tailwind detects them.
definePage({
  meta: {
    layout: 'empty',
    title: 'route.tokens',
  },
})

const scales = [
  {
    name: 'brand',
    steps: [
      { step: 50, cls: 'bg-brand-50' },
      { step: 100, cls: 'bg-brand-100' },
      { step: 200, cls: 'bg-brand-200' },
      { step: 300, cls: 'bg-brand-300' },
      { step: 400, cls: 'bg-brand-400' },
      { step: 500, cls: 'bg-brand-500' },
      { step: 600, cls: 'bg-brand-600' },
      { step: 700, cls: 'bg-brand-700' },
      { step: 800, cls: 'bg-brand-800' },
      { step: 900, cls: 'bg-brand-900' },
    ],
  },
  {
    name: 'brand-accent',
    steps: [
      { step: 50, cls: 'bg-brand-accent-50' },
      { step: 100, cls: 'bg-brand-accent-100' },
      { step: 200, cls: 'bg-brand-accent-200' },
      { step: 300, cls: 'bg-brand-accent-300' },
      { step: 400, cls: 'bg-brand-accent-400' },
      { step: 500, cls: 'bg-brand-accent-500' },
      { step: 600, cls: 'bg-brand-accent-600' },
      { step: 700, cls: 'bg-brand-accent-700' },
      { step: 800, cls: 'bg-brand-accent-800' },
      { step: 900, cls: 'bg-brand-accent-900' },
    ],
  },
  {
    name: 'secondary',
    steps: [
      { step: 50, cls: 'bg-secondary-50' },
      { step: 100, cls: 'bg-secondary-100' },
      { step: 200, cls: 'bg-secondary-200' },
      { step: 300, cls: 'bg-secondary-300' },
      { step: 400, cls: 'bg-secondary-400' },
      { step: 500, cls: 'bg-secondary-500' },
      { step: 600, cls: 'bg-secondary-600' },
      { step: 700, cls: 'bg-secondary-700' },
      { step: 800, cls: 'bg-secondary-800' },
      { step: 900, cls: 'bg-secondary-900' },
    ],
  },
  {
    name: 'tertiary',
    steps: [
      { step: 50, cls: 'bg-tertiary-50' },
      { step: 100, cls: 'bg-tertiary-100' },
      { step: 200, cls: 'bg-tertiary-200' },
      { step: 300, cls: 'bg-tertiary-300' },
      { step: 400, cls: 'bg-tertiary-400' },
      { step: 500, cls: 'bg-tertiary-500' },
      { step: 600, cls: 'bg-tertiary-600' },
      { step: 700, cls: 'bg-tertiary-700' },
      { step: 800, cls: 'bg-tertiary-800' },
      { step: 900, cls: 'bg-tertiary-900' },
    ],
  },
  {
    name: 'tertiary-accent',
    steps: [
      { step: 50, cls: 'bg-tertiary-accent-50' },
      { step: 100, cls: 'bg-tertiary-accent-100' },
      { step: 200, cls: 'bg-tertiary-accent-200' },
      { step: 300, cls: 'bg-tertiary-accent-300' },
      { step: 400, cls: 'bg-tertiary-accent-400' },
      { step: 500, cls: 'bg-tertiary-accent-500' },
      { step: 600, cls: 'bg-tertiary-accent-600' },
      { step: 700, cls: 'bg-tertiary-accent-700' },
      { step: 800, cls: 'bg-tertiary-accent-800' },
      { step: 900, cls: 'bg-tertiary-accent-900' },
    ],
  },
  {
    name: 'contrast-primary',
    steps: [
      { step: 50, cls: 'bg-contrast-primary-50' },
      { step: 100, cls: 'bg-contrast-primary-100' },
      { step: 200, cls: 'bg-contrast-primary-200' },
      { step: 300, cls: 'bg-contrast-primary-300' },
      { step: 400, cls: 'bg-contrast-primary-400' },
      { step: 500, cls: 'bg-contrast-primary-500' },
      { step: 600, cls: 'bg-contrast-primary-600' },
      { step: 700, cls: 'bg-contrast-primary-700' },
      { step: 800, cls: 'bg-contrast-primary-800' },
      { step: 900, cls: 'bg-contrast-primary-900' },
    ],
  },
  {
    name: 'contrast-secondary',
    steps: [
      { step: 50, cls: 'bg-contrast-secondary-50' },
      { step: 100, cls: 'bg-contrast-secondary-100' },
      { step: 200, cls: 'bg-contrast-secondary-200' },
      { step: 300, cls: 'bg-contrast-secondary-300' },
      { step: 400, cls: 'bg-contrast-secondary-400' },
      { step: 500, cls: 'bg-contrast-secondary-500' },
      { step: 600, cls: 'bg-contrast-secondary-600' },
      { step: 700, cls: 'bg-contrast-secondary-700' },
      { step: 800, cls: 'bg-contrast-secondary-800' },
      { step: 900, cls: 'bg-contrast-secondary-900' },
    ],
  },
  {
    name: 'pink',
    steps: [
      { step: 50, cls: 'bg-pink-50' },
      { step: 100, cls: 'bg-pink-100' },
      { step: 200, cls: 'bg-pink-200' },
      { step: 300, cls: 'bg-pink-300' },
      { step: 400, cls: 'bg-pink-400' },
      { step: 500, cls: 'bg-pink-500' },
      { step: 600, cls: 'bg-pink-600' },
      { step: 700, cls: 'bg-pink-700' },
      { step: 800, cls: 'bg-pink-800' },
      { step: 900, cls: 'bg-pink-900' },
    ],
  },
  {
    name: 'success',
    steps: [
      { step: 50, cls: 'bg-success-50' },
      { step: 100, cls: 'bg-success-100' },
      { step: 200, cls: 'bg-success-200' },
      { step: 300, cls: 'bg-success-300' },
      { step: 400, cls: 'bg-success-400' },
      { step: 500, cls: 'bg-success-500' },
      { step: 600, cls: 'bg-success-600' },
      { step: 700, cls: 'bg-success-700' },
      { step: 800, cls: 'bg-success-800' },
      { step: 900, cls: 'bg-success-900' },
    ],
  },
  {
    name: 'warning',
    steps: [
      { step: 50, cls: 'bg-warning-50' },
      { step: 100, cls: 'bg-warning-100' },
      { step: 200, cls: 'bg-warning-200' },
      { step: 300, cls: 'bg-warning-300' },
      { step: 400, cls: 'bg-warning-400' },
      { step: 500, cls: 'bg-warning-500' },
      { step: 600, cls: 'bg-warning-600' },
      { step: 700, cls: 'bg-warning-700' },
      { step: 800, cls: 'bg-warning-800' },
      { step: 900, cls: 'bg-warning-900' },
    ],
  },
  {
    name: 'error',
    steps: [
      { step: 50, cls: 'bg-error-50' },
      { step: 100, cls: 'bg-error-100' },
      { step: 200, cls: 'bg-error-200' },
      { step: 300, cls: 'bg-error-300' },
      { step: 400, cls: 'bg-error-400' },
      { step: 500, cls: 'bg-error-500' },
      { step: 600, cls: 'bg-error-600' },
      { step: 700, cls: 'bg-error-700' },
      { step: 800, cls: 'bg-error-800' },
      { step: 900, cls: 'bg-error-900' },
    ],
  },
  {
    name: 'info',
    steps: [
      { step: 50, cls: 'bg-info-50' },
      { step: 100, cls: 'bg-info-100' },
      { step: 200, cls: 'bg-info-200' },
      { step: 300, cls: 'bg-info-300' },
      { step: 400, cls: 'bg-info-400' },
      { step: 500, cls: 'bg-info-500' },
      { step: 600, cls: 'bg-info-600' },
      { step: 700, cls: 'bg-info-700' },
      { step: 800, cls: 'bg-info-800' },
      { step: 900, cls: 'bg-info-900' },
    ],
  },
  {
    name: 'gray',
    steps: [
      { step: 50, cls: 'bg-gray-50' },
      { step: 100, cls: 'bg-gray-100' },
      { step: 200, cls: 'bg-gray-200' },
      { step: 300, cls: 'bg-gray-300' },
      { step: 400, cls: 'bg-gray-400' },
      { step: 500, cls: 'bg-gray-500' },
      { step: 600, cls: 'bg-gray-600' },
      { step: 700, cls: 'bg-gray-700' },
      { step: 800, cls: 'bg-gray-800' },
      { step: 900, cls: 'bg-gray-900' },
    ],
  },
]
const semantic = [
  { name: 'page', bg: 'bg-page', fg: 'text-body' },
  { name: 'surface', bg: 'bg-surface', fg: 'text-body' },
  { name: 'surface-muted', bg: 'bg-surface-muted', fg: 'text-body' },
  { name: 'surface-input', bg: 'bg-surface-input', fg: 'text-body' },
  { name: 'surface-hover', bg: 'bg-surface-hover', fg: 'text-body' },
  { name: 'tint', bg: 'bg-tint', fg: 'text-tint-fg' },
  { name: 'tint-hover', bg: 'bg-tint-hover', fg: 'text-tint-fg' },
  { name: 'primary', bg: 'bg-primary', fg: 'text-on-primary' },
  { name: 'primary-hover', bg: 'bg-primary-hover', fg: 'text-on-primary' },
]
const text = [
  { name: 'text-heading', cls: 'text-heading' },
  { name: 'text-body', cls: 'text-body' },
  { name: 'text-muted', cls: 'text-muted' },
  { name: 'link', cls: 'text-link' },
  { name: 'tint-fg', cls: 'text-tint-fg' },
  { name: 'on-primary', cls: 'bg-primary text-on-primary' },
]
const lines = [
  { name: 'border', cls: 'border-2 border-border' },
  { name: 'border-input', cls: 'border-2 border-border-input' },
  { name: 'focus-ring', cls: 'border-2 border-focus-ring' },
]
const states = [
  { name: 'ok', solid: 'bg-ok', tint: 'bg-ok-tint text-ok-fg' },
  { name: 'warn', solid: 'bg-warn', tint: 'bg-warn-tint text-warn-fg' },
  { name: 'err', solid: 'bg-err', tint: 'bg-err-tint text-err-fg' },
  { name: 'info', solid: 'bg-info', tint: 'bg-info-tint text-info-fg' },
]
const series = [
  { name: 'series-you', cls: 'bg-series-you' },
  { name: 'series-2', cls: 'bg-series-2' },
  { name: 'series-3', cls: 'bg-series-3' },
  { name: 'series-4', cls: 'bg-series-4' },
  { name: 'series-5', cls: 'bg-series-5' },
  { name: 'series-6', cls: 'bg-series-6' },
  { name: 'series-rest', cls: 'bg-series-rest' },
]
const seq = [
  { name: 'seq-1', cls: 'bg-seq-1' },
  { name: 'seq-2', cls: 'bg-seq-2' },
  { name: 'seq-3', cls: 'bg-seq-3' },
  { name: 'seq-4', cls: 'bg-seq-4' },
  { name: 'seq-5', cls: 'bg-seq-5' },
  { name: 'seq-6', cls: 'bg-seq-6' },
  { name: 'seq-7', cls: 'bg-seq-7' },
]
const div = [
  { name: 'div-neg', cls: 'bg-div-neg' },
  { name: 'div-mid', cls: 'bg-div-mid' },
  { name: 'div-pos', cls: 'bg-div-pos' },
]
const hits = [
  { name: 'hit-exact', cls: 'bg-hit-exact text-hit-exact-fg' },
  { name: 'hit-near', cls: 'bg-hit-near text-hit-near-fg' },
  { name: 'hit-far', cls: 'bg-hit-far text-hit-far-fg' },
]
const medals = [
  { name: 'gold', cls: 'bg-gold' },
  { name: 'silver', cls: 'bg-silver' },
  { name: 'bronze', cls: 'bg-bronze' },
]
const radii = [
  { name: 'rounded', cls: 'rounded' },
  { name: 'rounded-md', cls: 'rounded-md' },
  { name: 'rounded-lg', cls: 'rounded-lg' },
  { name: 'rounded-full', cls: 'rounded-full' },
]
const shadows = [
  { name: 'shadow-sm', cls: 'shadow-sm' },
  { name: 'shadow-card', cls: 'shadow-card ring-1 ring-card-ring' },
  { name: 'shadow-lg', cls: 'shadow-lg' },
]
const spacing = [
  { name: '2 · 8 px controles', cls: 'w-2' },
  { name: '3 · 12 px celdas', cls: 'w-3' },
  { name: '4 · 16 px bloques', cls: 'w-4' },
  { name: '5 · 20 px tarjeta', cls: 'w-5' },
  { name: '6 · 24 px secciones', cls: 'w-6' },
  { name: '8 · 32 px páginas', cls: 'w-8' },
]
const containers = [
  { name: 'container-sm', cls: 'max-w-sm', size: '448 px' },
  { name: 'container-md', cls: 'max-w-md', size: '896 px' },
  { name: 'container-lg', cls: 'max-w-lg', size: '1152 px' },
  { name: 'container-xl', cls: 'max-w-xl', size: '1280 px' },
  { name: 'container-2xl', cls: 'max-w-2xl', size: '1536 px' },
]
</script>

<template>
  <main class="bg-page text-body min-h-screen" data-testid="tokens-showcase">
    <div class="mx-auto flex max-w-xl flex-col gap-6 px-6 py-8">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-heading text-4xl font-semibold">Fundamentos</h1>
          <p class="text-muted text-sm">
            Tokens de color, forma y espaciado (F1). Solo desarrollo.
          </p>
        </div>
        <ThemeSwitch />
      </header>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Escalas</h2>
        <div class="flex flex-col gap-3">
          <div v-for="s in scales" :key="s.name">
            <p class="text-muted mb-1 text-xs font-semibold">{{ s.name }}</p>
            <div class="grid grid-cols-5 gap-1 sm:grid-cols-10">
              <div
                v-for="c in s.steps"
                :key="c.step"
                class="h-8 rounded"
                :class="c.cls"
                :title="`${s.name}-${c.step}`"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Semánticos</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="c in semantic"
            :key="c.name"
            class="border-border rounded-md border p-3 text-sm"
            :class="[c.bg, c.fg]"
          >
            {{ c.name }}
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="c in text"
            :key="c.name"
            class="bg-surface-muted rounded-md p-3 text-sm font-semibold"
            :class="c.cls"
          >
            {{ c.name }}
          </div>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-3">
          <div
            v-for="c in lines"
            :key="c.name"
            class="bg-surface-input rounded-md p-3 text-xs"
            :class="c.cls"
          >
            {{ c.name }}
          </div>
        </div>
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Estados</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="c in states" :key="c.name" class="flex flex-col gap-2">
            <div class="h-8 rounded" :class="c.solid" />
            <div class="rounded p-2 text-sm" :class="c.tint">{{ c.name }}</div>
          </div>
        </div>
      </section>

      <section class="bg-chart-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Datos (solo gráficos)</h2>
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="c in series"
            :key="c.name"
            class="h-8 rounded"
            :class="c.cls"
            :title="c.name"
          />
        </div>
        <div class="mt-3 grid grid-cols-7 gap-1">
          <div v-for="c in seq" :key="c.name" class="h-8 rounded" :class="c.cls" :title="c.name" />
        </div>
        <div class="mt-3 grid grid-cols-3 gap-1">
          <div v-for="c in div" :key="c.name" class="h-8 rounded" :class="c.cls" :title="c.name" />
        </div>
        <div class="mt-3 grid grid-cols-3 gap-3">
          <div
            v-for="c in hits"
            :key="c.name"
            class="rounded p-2 text-sm font-semibold"
            :class="c.cls"
          >
            {{ c.name }}
          </div>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-3">
          <div
            v-for="c in medals"
            :key="c.name"
            class="h-8 rounded"
            :class="c.cls"
            :title="c.name"
          />
        </div>
        <svg
          class="mt-3 h-16 w-full"
          viewBox="0 0 200 40"
          role="img"
          aria-label="Muestra de gráfico"
        >
          <path d="M0 10H200M0 20H200M0 30H200" class="stroke-grid" fill="none" />
          <path d="M0 38H200" class="stroke-axis" fill="none" />
          <path
            d="M0 30L50 20L100 24L150 8L200 12"
            class="stroke-series-you"
            fill="none"
            stroke-width="2"
          />
          <path
            d="M0 34L50 28L100 30L150 22L200 20"
            class="stroke-series-2"
            fill="none"
            stroke-width="2"
          />
        </svg>
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Forma y espaciado</h2>
        <div class="flex flex-wrap gap-4">
          <div
            v-for="c in radii"
            :key="c.name"
            class="bg-tint text-tint-fg flex h-16 w-24 items-center justify-center text-xs"
            :class="c.cls"
          >
            {{ c.name }}
          </div>
        </div>
        <div class="bg-page mt-4 flex flex-wrap gap-4 rounded-lg p-4">
          <div
            v-for="c in shadows"
            :key="c.name"
            class="bg-surface text-body flex h-16 w-24 items-center justify-center rounded-lg text-xs"
            :class="c.cls"
          >
            {{ c.name }}
          </div>
        </div>
        <div class="mt-4 flex flex-col gap-2">
          <div v-for="c in spacing" :key="c.name" class="flex items-center gap-3 text-xs">
            <div class="bg-primary h-3 rounded" :class="c.cls" />
            <span class="text-muted">{{ c.name }}</span>
          </div>
        </div>
        <div class="mt-4 flex flex-col gap-1">
          <p v-for="c in containers" :key="c.name" class="text-muted text-xs">
            {{ c.name }} · {{ c.size }}
          </p>
        </div>
      </section>
    </div>
  </main>
</template>
