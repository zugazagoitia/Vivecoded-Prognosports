<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StartGridPosition } from '@/api/schemas'
import PTag from '@/components/ui/PTag.vue'
import { focusRing } from '@/components/ui/styles'
import { textColorFor } from '@/components/ui/textColor'
import { splitStaggered, teamColor } from '@/lib/gp'

/**
 * Staggered start grid (odd positions left, even right, shifted 21 px) plus the pit lane.
 * `compact` is the mobile version: two columns without surnames and pit tags with the code only.
 * `selectable` (G4) turns every cell into a toggle button (`aria-pressed` on `selectedId`) that
 * emits `select` with the driver id; cells are taller and show the car number.
 */
const props = defineProps<{
  grid: readonly StartGridPosition[]
  compact?: boolean
  selectable?: boolean
  selectedId?: number
}>()
defineEmits<{ select: [driverId: number] }>()
const { t } = useI18n()
const split = computed(() => splitStaggered(props.grid))
const code = (g: StartGridPosition) => g.driver.code ?? g.driver.lastname ?? ''
const fullName = (g: StartGridPosition) =>
  [g.driver.firstname, g.driver.lastname].filter(Boolean).join(' ')
const numberStyle = (g: StartGridPosition) => {
  const bg = teamColor(g.driver)
  return bg ? { backgroundColor: bg } : undefined
}
const numberText = (g: StartGridPosition) => {
  const bg = teamColor(g.driver)
  return bg && textColorFor(bg) === 'white' ? 'text-white' : bg ? 'text-gray-900' : 'text-heading'
}
const slotClass = (g: StartGridPosition) => [
  'text-heading relative flex min-h-[46px] w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border px-2.5 pt-1 text-[13px]',
  props.selectedId === g.driver.id
    ? 'bg-tint border-focus-ring'
    : 'bg-surface border-border hover:border-focus-ring',
  focusRing,
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex" :class="compact ? 'gap-2.5' : selectable ? 'gap-4' : 'gap-3.5'">
      <ol
        v-for="(col, i) in [split.left, split.right]"
        :key="i"
        class="m-0 flex min-w-0 flex-1 list-none flex-col p-0"
        :class="[
          compact ? 'gap-1.5' : selectable ? 'gap-3' : 'gap-2',
          i === 1 ? (compact ? 'pt-3' : selectable ? 'pt-[29px]' : 'pt-[21px]') : '',
        ]"
        :data-grid-col="i === 0 ? 'left' : 'right'"
      >
        <li
          v-for="g in col"
          :key="g.driver.id"
          :title="selectable ? undefined : fullName(g)"
          :class="
            selectable
              ? ''
              : 'bg-surface-muted flex min-h-[34px] items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]'
          "
        >
          <button
            v-if="selectable"
            type="button"
            :aria-pressed="selectedId === g.driver.id"
            :aria-label="t('consensus.grid.slot', { n: g.position, name: fullName(g) })"
            :class="slotClass(g)"
            @click="$emit('select', g.driver.id)"
          >
            <span
              class="absolute inset-x-0 top-0 h-1"
              :class="teamColor(g.driver) ? '' : 'bg-border-input'"
              :style="teamColor(g.driver) ? { backgroundColor: teamColor(g.driver) } : undefined"
              aria-hidden="true"
            />
            <span class="text-muted w-6 text-xs font-bold tabular-nums" aria-hidden="true">{{
              t('gp.grid.position', { n: g.position })
            }}</span>
            <b class="font-semibold" aria-hidden="true">{{ code(g) }}</b>
            <span
              v-if="g.driver.number != null"
              class="bg-border-input ml-auto rounded-sm px-1.5 text-[11px] font-bold tabular-nums"
              :class="numberText(g)"
              :style="numberStyle(g)"
              aria-hidden="true"
              >{{ g.driver.number }}</span
            >
          </button>
          <template v-else>
            <span class="text-muted w-6 text-xs font-bold tabular-nums">{{
              t('gp.grid.position', { n: g.position })
            }}</span>
            <span
              class="bg-border-input w-1 rounded-sm"
              :class="compact ? 'h-3.5' : 'h-4'"
              :style="teamColor(g.driver) ? { backgroundColor: teamColor(g.driver) } : undefined"
              aria-hidden="true"
            />
            <b class="text-heading font-semibold">{{ code(g) }}</b>
            <span v-if="!compact" class="text-muted min-w-0 truncate text-sm">{{
              g.driver.lastname
            }}</span>
          </template>
        </li>
      </ol>
    </div>
    <div
      v-if="split.pit.length"
      class="border-border-input flex flex-col gap-2 border-t border-dashed pt-2.5"
    >
      <span class="text-muted text-xs font-semibold tracking-[0.05em] uppercase">{{
        selectable ? t('consensus.grid.pit') : t('gp.grid.pit')
      }}</span>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li v-for="g in split.pit" :key="g.driver.id">
          <button
            v-if="selectable"
            type="button"
            :aria-pressed="selectedId === g.driver.id"
            :aria-label="
              g.note
                ? t('consensus.grid.pitSlot', { name: fullName(g), note: g.note })
                : t('consensus.grid.pitSlotNoNote', { name: fullName(g) })
            "
            :class="[
              'text-heading inline-flex min-h-11 cursor-pointer items-center rounded-md border px-3 text-[13px] font-semibold',
              selectedId === g.driver.id
                ? 'bg-tint border-focus-ring'
                : 'bg-surface-muted border-transparent',
              focusRing,
            ]"
            @click="$emit('select', g.driver.id)"
          >
            <span aria-hidden="true">{{
              g.note ? t('gp.grid.pitTag', { code: code(g), note: g.note }) : code(g)
            }}</span>
          </button>
          <PTag v-else>{{
            compact || !g.note ? code(g) : t('gp.grid.pitTag', { code: code(g), note: g.note })
          }}</PTag>
        </li>
      </ul>
    </div>
  </div>
</template>
