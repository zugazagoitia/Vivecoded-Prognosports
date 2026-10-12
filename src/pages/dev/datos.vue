<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import BottomSheet from '@/components/data/BottomSheet.vue'
import ConfirmLeaveDialog from '@/components/data/ConfirmLeaveDialog.vue'
import FormChips from '@/components/data/FormChips.vue'
import HitCell from '@/components/data/HitCell.vue'
import HitLegend from '@/components/data/HitLegend.vue'
import PlayerChip from '@/components/data/PlayerChip.vue'
import PredictionSlot from '@/components/data/PredictionSlot.vue'
import SaveBar from '@/components/data/SaveBar.vue'
import type { HitKind, SlotDriver } from '@/components/data/types'
import ValidationList from '@/components/data/ValidationList.vue'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'
import { useHighlight } from '@/composables/useHighlight'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'

// Development-only catalogue of the F4 data pieces (unlisted, noindex).
definePage({ meta: { layout: 'empty', title: 'route.datos' } })

const hits: { kind: HitKind; label: string }[] = [
  { kind: 'exact', label: 'NOR' },
  { kind: 'near', label: 'VER' },
  { kind: 'far', label: 'LEC' },
  { kind: 'miss', label: 'HAM' },
  { kind: 'hidden', label: 'PIA' },
]

const pool: SlotDriver[] = [
  { code: 'NOR', name: 'Lando Norris', teamColor: 'var(--color-secondary-500)' },
  { code: 'VER', name: 'Max Verstappen', teamColor: 'var(--color-info-600)' },
  { code: 'LEC', name: 'Charles Leclerc', teamColor: 'var(--color-error-700)' },
  { code: 'HAM', name: 'Lewis Hamilton', teamColor: 'var(--color-error-700)' },
  { code: 'PIA', name: 'Oscar Piastri', teamColor: 'var(--color-secondary-500)' },
]
const slots = ref<(SlotDriver | null)[]>([pool[0]!, pool[1]!, null, null, null])
const selected = ref<number | null>(null)
const sheetOpen = ref(false)
const free = computed(() => pool.filter((d) => !slots.value.some((s) => s?.code === d.code)))

async function focusSlot(position: number) {
  await nextTick()
  document.querySelector<HTMLElement>(`[data-position="${position}"] [role="button"]`)?.focus()
}
function pick(driver: SlotDriver) {
  if (selected.value === null) return
  slots.value[selected.value - 1] = driver
  const pos = selected.value
  selected.value = null
  sheetOpen.value = false
  dirty.value = true
  void focusSlot(pos)
}
function onSelect(position: number) {
  selected.value = position
  sheetOpen.value = true
}
function swap(a: number, b: number) {
  const s = slots.value
  ;[s[a - 1], s[b - 1]] = [s[b - 1] ?? null, s[a - 1] ?? null]
  dirty.value = true
  void focusSlot(b)
}
function clear(position: number) {
  slots.value[position - 1] = null
  dirty.value = true
  void focusSlot(position)
}
function onDrop(position: number, p: { fromPosition?: number; driverCode?: string }) {
  if (p.fromPosition) swap(p.fromPosition, position)
  else {
    const d = pool.find((x) => x.code === p.driverCode)
    if (d) {
      selected.value = position
      pick(d)
    }
  }
}

const players = [
  { id: 'me', name: 'Tú' },
  { id: 'a', name: 'Alberto' },
  { id: 'b', name: 'Beatriz' },
  { id: 'c', name: 'Carlos' },
  { id: 'd', name: 'Dolores' },
  { id: 'e', name: 'Enrique' },
  { id: 'f', name: 'Fátima' },
]
const hl = useHighlight('me')
hl.set(['a', 'b'])

const dirty = ref(false)
const saving = ref(false)
const changes = computed(() => (dirty.value ? 3 : 0))
const guard = useUnsavedChanges(dirty)
function save() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    dirty.value = false
  }, 600)
}

const checks = [
  { label: 'Calendario completo', state: 'ok' as const },
  { label: 'Faltan 2 pilotos por confirmar', state: 'warn' as const, href: '/dev/datos' },
  { label: 'Sin fecha de cierre', state: 'err' as const, href: '/dev/datos' },
]
</script>

<template>
  <main class="bg-page text-body min-h-screen pb-28" data-testid="datos-showcase">
    <div class="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-heading text-4xl font-semibold">Piezas de datos</h1>
          <p class="text-muted text-sm">Catálogo de F4. Solo desarrollo.</p>
        </div>
        <ThemeSwitch />
      </header>

      <section
        aria-labelledby="h-hit"
        class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1"
      >
        <h2 id="h-hit" class="text-heading mb-4 text-xl font-semibold">HitCell</h2>
        <div class="mb-3 flex flex-wrap gap-2">
          <HitCell v-for="h in hits" :key="h.kind" :kind="h.kind" :label="h.label" />
        </div>
        <HitLegend />
      </section>

      <section
        aria-labelledby="h-form"
        class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1"
      >
        <h2 id="h-form" class="text-heading mb-4 text-xl font-semibold">FormChips</h2>
        <div class="flex flex-col gap-3">
          <FormChips
            :places="[1, 3, 7, 2, 5]"
            :move="2"
            :gps="['Bahréin', 'Miami', 'Mónaco', 'España', 'Italia']"
          />
          <FormChips :places="[4, 6, 9, 12, 8]" :move="-1" />
          <FormChips :places="[2, 2, 3, 1, 10]" :move="0" />
        </div>
      </section>

      <section
        aria-labelledby="h-slot"
        class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1"
      >
        <h2 id="h-slot" class="text-heading mb-1 text-xl font-semibold">PredictionSlot</h2>
        <p class="text-muted mb-4 text-sm">
          Teclado: Intro elige, Supr quita, Alt + flechas reordenan.
        </p>
        <div class="flex flex-col gap-2">
          <PredictionSlot
            v-for="(d, i) in slots"
            :key="i"
            :position="i + 1"
            :driver="d"
            :selected="selected === i + 1"
            :can-move-up="i > 0"
            :can-move-down="i < slots.length - 1"
            @select="onSelect(i + 1)"
            @remove="clear(i + 1)"
            @move-up="swap(i + 1, i)"
            @move-down="swap(i + 1, i + 2)"
            @drop="(p) => onDrop(i + 1, p)"
          />
        </div>
      </section>

      <section
        aria-labelledby="h-val"
        class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1"
      >
        <h2 id="h-val" class="text-heading mb-4 text-xl font-semibold">ValidationList</h2>
        <ValidationList :items="checks" />
      </section>

      <section
        aria-labelledby="h-save"
        class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1"
      >
        <h2 id="h-save" class="text-heading mb-4 text-xl font-semibold">SaveBar</h2>
        <div class="bg-page flex flex-col gap-3 rounded-lg p-3">
          <SaveBar :count="1" position="static" />
          <SaveBar :count="3" position="static" variant="surface" />
          <SaveBar :count="3" position="static" saving />
        </div>
        <p class="text-muted mt-3 text-sm">
          Edita un puesto de arriba para que aparezca la barra fija; al salir de la ruta pide
          confirmación.
        </p>
      </section>

      <section
        aria-labelledby="h-chip"
        class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1"
      >
        <h2 id="h-chip" class="text-heading mb-4 text-xl font-semibold">PlayerChip</h2>
        <div role="group" aria-label="Resaltar" class="flex flex-wrap gap-2">
          <PlayerChip
            v-for="p in players"
            :key="p.id"
            :player="p"
            :locked="p.id === 'me'"
            :pressed="hl.isOn(p.id)"
            :color="hl.colorOf(p.id)"
            @toggle="hl.toggle"
          />
        </div>
      </section>

      <section
        aria-labelledby="h-sheet"
        class="bg-surface shadow-card ring-card-ring rounded-lg p-5 ring-1"
      >
        <h2 id="h-sheet" class="text-heading mb-4 text-xl font-semibold">BottomSheet</h2>
        <button
          type="button"
          class="bg-primary text-on-primary hover:bg-primary-hover focus-visible:outline-focus-ring min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          @click="sheetOpen = true"
        >
          Abrir selector
        </button>
      </section>
    </div>

    <BottomSheet v-model:open="sheetOpen" title="Elegir piloto" always @close="selected = null">
      <ul class="m-0 flex list-none flex-col p-0">
        <li v-for="d in free" :key="d.code">
          <button
            type="button"
            class="hover:bg-surface-muted focus-visible:outline-focus-ring text-heading flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm focus-visible:outline-2"
            @click="pick(d)"
          >
            {{ d.name }}
          </button>
        </li>
      </ul>
    </BottomSheet>

    <SaveBar :count="changes" :saving="saving" @save="save" @discard="dirty = false" />
    <ConfirmLeaveDialog :open="guard.open.value" @stay="guard.stay" @leave="guard.leave" />
  </main>
</template>
