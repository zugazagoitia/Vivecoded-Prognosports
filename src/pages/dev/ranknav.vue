<script setup lang="ts">
// Development-only harness of the N3 RankNav (unlisted, noindex via /dev/*). Holds its own
// state instead of the router so axe and visual tests can drive flags and seasons.
import { computed, reactive, ref } from 'vue'
import RankNav from '@/components/layout/RankNav.vue'
import { offeredSeasons, type FlagCheck } from '@/components/layout/rankNav'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import { FLAG_DEFS, FLAG_NAMES } from '@/flags'

definePage({ meta: { layout: 'empty', title: 'route.ranking' } })

const communities = [
  { id: 'x', name: 'Los del Paddock' },
  { id: 'y', name: 'Oficina F1' },
]
const allSeasons = [
  { id: 2026, label: '2026', current: true },
  { id: 2025, label: '2025' },
  { id: 2024, label: '2024' },
]
const withPoints = new Set<string | number>([2026, 2025])
const { seasons, fallback } = offeredSeasons(allSeasons, withPoints)

const on = reactive<Record<string, boolean>>(Object.fromEntries(FLAG_NAMES.map((n) => [n, false])))
const isOn: FlagCheck = (f) => on[f] === true

const community = ref<string | number>('x')
const season = ref<string | number>(2026)
const path = ref('clasificacion/general')
const seccion = computed(() => path.value.split('/')[0] ?? '')
const vista = computed(() => path.value.split('/')[1])

function go(full: string) {
  path.value = full.split('/').slice(4).join('/')
}
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-8">
    <RankNav
      v-model:community-id="community"
      v-model:season-id="season"
      :communities="communities"
      :seasons="seasons"
      :seasons-fallback="fallback"
      competition="Fórmula 1"
      :played="7"
      :total="24"
      :seccion="seccion"
      :vista="vista"
      :flags="isOn"
      @navigate="go"
    />
    <p class="text-muted text-sm">
      Ruta actual: <code data-testid="current">{{ community }}/{{ season }}/{{ path }}</code>
    </p>
    <fieldset class="flex flex-wrap gap-x-4">
      <legend class="text-heading mb-2 text-sm font-semibold">Feature flags (demo)</legend>
      <PCheckbox v-for="n in FLAG_NAMES" :key="n" v-model="on[n]" :label="FLAG_DEFS[n].label" />
    </fieldset>
  </main>
</template>
