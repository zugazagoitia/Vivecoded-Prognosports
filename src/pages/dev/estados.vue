<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  EmptyState,
  ErrorState,
  LoadingRegion,
  SessionStateAlert,
  SessionTimeline,
  Skeleton,
} from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'

// Development-only catalogue of the F6 system states (unlisted; /dev/* is served noindex).
definePage({
  meta: {
    layout: 'empty',
    title: 'route.estados',
  },
})

const { t } = useI18n()
const retries = ref(0)
const networkError = new TypeError('network')

// Fixed clock so the catalogue is deterministic (visual snapshots).
const NOW = Date.parse('2026-10-10T12:00:00Z')
const openSession = { date: '2026-10-10T14:05:00Z' }
const pastSession = { date: '2026-10-10T10:00:00Z' }

const people = [
  { id: 1, name: 'Alberto' },
  { id: 2, name: 'Lucía' },
  { id: 3, name: 'Marta' },
]
</script>

<template>
  <main class="bg-page text-body min-h-screen" data-testid="estados-showcase">
    <div class="mx-auto flex max-w-xl flex-col gap-6 px-6 py-8">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-heading text-4xl font-semibold">Estados</h1>
          <p class="text-muted text-sm">Carga, vacío y error (F6). Solo desarrollo.</p>
        </div>
        <ThemeSwitch />
      </header>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Vacío</h2>
        <div class="flex flex-col gap-4">
          <EmptyState variant="noCommunity">
            <PButton>{{ t('states.empty.noCommunity.create') }}</PButton>
            <PButton variant="outline">{{ t('states.empty.noCommunity.explore') }}</PButton>
          </EmptyState>
          <EmptyState variant="noResults">
            <PButton variant="outline">{{ t('states.empty.noResults.clear') }}</PButton>
          </EmptyState>
          <EmptyState variant="noSessionResults">
            <PButton variant="outline">{{ t('states.empty.noSessionResults.notices') }}</PButton>
          </EmptyState>
        </div>
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Esqueletos</h2>
        <div class="flex flex-col gap-4">
          <Skeleton variant="line" :lines="2" />
          <Skeleton variant="avatar" />
          <Skeleton variant="card" />
          <Skeleton variant="table" :rows="3" />
          <Skeleton variant="chart" />
        </div>
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Sin saltos de diseño</h2>
        <p class="text-muted mb-3 text-sm">El esqueleto y el contenido final ocupan lo mismo.</p>
        <div data-testid="cls-skeleton"><Skeleton variant="table" :rows="3" /></div>
        <ul class="mt-4" data-testid="cls-final">
          <li v-for="p in people" :key="p.id" class="flex h-12 items-center gap-3">
            <span
              class="bg-tint text-tint-fg flex size-10 flex-none items-center justify-center rounded-full text-sm font-semibold"
              >{{ p.name.slice(0, 1) }}</span
            >
            <span class="flex-1 text-sm">{{ p.name }}</span>
          </li>
        </ul>
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Carga lenta</h2>
        <LoadingRegion loading slow @retry="retries++">
          <template #skeleton><Skeleton variant="table" :rows="2" /></template>
        </LoadingRegion>
        <p class="text-muted mt-2 text-xs" data-testid="slow-retries">Reintentos: {{ retries }}</p>
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Error de sección</h2>
        <ErrorState what="la clasificación" :error="networkError" />
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Avisos</h2>
        <div class="flex flex-col gap-3">
          <PrognoAlert role="status" variant="warn" :title="t('states.notice.offline')" />
          <PrognoAlert
            role="status"
            variant="info"
            :title="t('states.notice.closed', { session: 'la Carrera', time: '14:00' })"
          />
          <PrognoAlert role="status" variant="brand" :title="t('states.notice.beta')" />
          <PrognoAlert
            role="status"
            variant="err"
            :title="t('states.notice.notSaved', { n: 2, total: 10, chosen: 8 }, 2)"
          />
        </div>
      </section>

      <section class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1">
        <h2 class="text-heading mb-4 text-xl font-semibold">Estados de sesión</h2>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-3">
            <SessionStateAlert :session="openSession" :now="NOW" />
            <SessionTimeline state="open" />
          </div>
          <div class="flex flex-col gap-3">
            <SessionStateAlert :session="pastSession" :now="NOW" />
            <SessionTimeline state="closed" />
          </div>
          <div class="flex flex-col gap-3">
            <SessionStateAlert :session="pastSession" :now="NOW" has-results />
            <SessionTimeline state="scored" />
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
