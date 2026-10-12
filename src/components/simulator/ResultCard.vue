<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { focusRing, controlBase } from '@/components/ui/styles'
import { formatPoints } from '@/lib/gp'
import { cellTitle, type SimRow } from '@/lib/simulator'
import type { SimDriver } from './useSimulator'

/**
 * «Resultado posible»: one row per position with a driver select, the points your prediction
 * gets for that driver and up/down buttons. Every control is a native select/button (keyboard),
 * 44 px high on every viewport.
 */
const props = defineProps<{
  rows: { position: number; driverId: number; driver?: SimDriver; score: SimRow }[]
  drivers: SimDriver[]
  mineCodes: string[]
}>()
const emit = defineEmits<{
  select: [index: number, driverId: number]
  move: [index: number, dir: -1 | 1]
}>()
const { t } = useI18n()
const list = ref<HTMLElement | null>(null)

/** «1.ª» (the select names a feminine noun: «posición»). */
const fem = (n: number) => `${n}.ª`

const PILL: Record<SimRow['kind'], string> = {
  exact: 'bg-hit-exact text-hit-exact-fg border-hit-exact-fg border-solid hit-ex',
  near: 'bg-hit-near text-hit-near-fg border-hit-near-fg border-dashed hit-1',
  far: 'bg-hit-far text-hit-far-fg border-hit-far-fg border-dotted hit-2',
  miss: 'text-muted border-border-input border-solid font-normal hit-x',
}
const btn = [
  'text-body border-border-input hover:bg-surface-muted inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-lg border disabled:cursor-default disabled:opacity-40',
  focusRing,
].join(' ')

async function move(index: number, dir: -1 | 1) {
  emit('move', index, dir)
  const to = index + dir
  if (to < 0 || to >= props.rows.length) return
  await nextTick()
  // Focus follows the driver: the same kind of button in the row it moved to; at the end of the
  // list that button is disabled, so the opposite one takes the focus.
  const row = list.value?.querySelector<HTMLElement>(`[data-position="${to + 1}"]`)
  const want = row?.querySelector<HTMLButtonElement>(`[data-move="${dir}"]`)
  const other = row?.querySelector<HTMLButtonElement>(`[data-move="${-dir}"]`)
  ;(want && !want.disabled ? want : other)?.focus()
}
</script>

<template>
  <PCard tag="section" :padded="false">
    <template #header>
      <div class="flex flex-col gap-0.5">
        <PTitle level="header" as="h2">{{ t('simulator.result.title') }}</PTitle>
        <p class="text-muted text-[13px]">{{ t('simulator.result.hint') }}</p>
      </div>
    </template>
    <ol
      ref="list"
      class="m-0 flex list-none flex-col gap-2 p-3 sm:p-5"
      :aria-label="t('simulator.result.list')"
    >
      <li
        v-for="(row, i) in rows"
        :key="row.position"
        :data-position="row.position"
        class="bg-surface ring-border flex min-h-14 items-center gap-2 rounded-lg px-2 py-1 ring-1"
      >
        <span class="text-heading w-5 flex-none text-center text-sm font-semibold tabular-nums">{{
          row.position
        }}</span>
        <span
          aria-hidden="true"
          class="h-[22px] w-1 flex-none rounded-full"
          :class="!row.driver?.color && 'bg-series-rest'"
          :style="row.driver?.color ? { backgroundColor: row.driver.color } : undefined"
        />
        <select
          :value="row.driverId"
          :aria-label="t('simulator.result.driverAt', { place: fem(row.position) })"
          :class="[controlBase, 'min-w-0 flex-1 font-semibold md:min-h-11']"
          @change="emit('select', i, Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="d in drivers" :key="d.id" :value="d.id">
            {{ d.code }} · {{ d.lastname }}
          </option>
        </select>
        <span
          :data-kind="row.score.kind"
          class="inline-flex min-h-8 min-w-11 flex-none items-center justify-center rounded-md border-2 px-2 text-sm font-semibold tabular-nums"
          :class="PILL[row.score.kind]"
        >
          <span aria-hidden="true">{{ formatPoints(row.score.points) }}</span>
          <span class="sr-only"
            >{{
              t('simulator.cell.points', { n: formatPoints(row.score.points) }, row.score.points)
            }}, {{ cellTitle(row.score.placedAt) }}</span
          >
        </span>
        <button
          type="button"
          :class="btn"
          data-move="-1"
          :disabled="i === 0"
          :aria-label="t('simulator.result.up', { driver: row.driver?.code ?? '' })"
          @click="move(i, -1)"
        >
          <PIcon name="arrow-up" :size="16" />
        </button>
        <button
          type="button"
          :class="btn"
          data-move="1"
          :disabled="i === rows.length - 1"
          :aria-label="t('simulator.result.down', { driver: row.driver?.code ?? '' })"
          @click="move(i, 1)"
        >
          <PIcon name="arrow-down" :size="16" />
        </button>
      </li>
    </ol>
    <template v-if="mineCodes.length" #footer>
      <p class="text-muted mr-auto text-[13px]">
        {{ t('simulator.result.mine') }}
        <b class="text-heading font-semibold">{{ mineCodes.join(' ') }}</b>
      </p>
    </template>
  </PCard>
</template>
