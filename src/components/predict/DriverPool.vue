<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Driver } from '@/api/schemas'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTitle from '@/components/ui/PTitle.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { controlBase, focusRing } from '@/components/ui/styles'
import { textColorFor } from '@/components/ui/textColor'
import { teamColor } from '@/lib/gp'
import { driverCode, driverName, groupDrivers, type SortMode } from '@/lib/predict'
import { formatOrdinal } from '@/utils/numbers'

/**
 * «Pilotos»: the pool to pick from (desktop). Click/Enter on a driver puts it in the active slot;
 * dragging it onto a slot is the pointer shortcut (the drag is never the only way). Drivers
 * already placed stay available (using one moves it).
 */
const props = defineProps<{
  drivers: Driver[]
  /** Start position by driver id (empty until the grid is published). */
  grid: ReadonlyMap<number, number>
  /** Slot (1-based) occupied by each driver already placed. */
  used: ReadonlyMap<number, number>
  disabled?: boolean
}>()
const emit = defineEmits<{ pick: [id: number] }>()
const { t } = useI18n()

const mode = ref<SortMode>('team')
const query = ref('')
const options = computed(() => [
  { value: 'team' as const, label: t('predict.pool.byTeam') },
  { value: 'grid' as const, label: t('predict.pool.byGrid') },
  { value: 'no' as const, label: t('predict.pool.byNumber') },
])
const groups = computed(() =>
  groupDrivers(props.drivers, mode.value, props.grid, query.value, {
    grid: t('predict.pool.gridGroup'),
    no: t('predict.pool.numberGroup'),
    noTeam: t('predict.pool.noTeam'),
  }),
)

function onDragStart(e: DragEvent, d: Driver) {
  if (props.disabled || !e.dataTransfer) return
  e.dataTransfer.setData('text/x-driver', driverCode(d))
  e.dataTransfer.effectAllowed = 'copyMove'
}
const dorsal = (d: Driver) =>
  textColorFor(teamColor(d) ?? 'rgb(107 114 128)') === 'white' ? 'text-white' : 'text-gray-900'
</script>

<template>
  <PCard tag="section" :padded="false" class="flex min-h-0 flex-col">
    <template #header>
      <PTitle level="header" as="h2">{{ t('predict.pool.title') }}</PTitle>
      <SegmentedControl v-model="mode" :options="options" :label="t('predict.pool.sort')" />
    </template>
    <div class="flex flex-col gap-3 overflow-y-auto p-4 min-[1181px]:max-h-[72vh]">
      <div class="relative">
        <PIcon
          name="magnifying-glass"
          :size="16"
          class="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          v-model="query"
          type="search"
          autocomplete="off"
          :placeholder="t('predict.pool.search')"
          :aria-label="t('predict.pool.search')"
          :class="[controlBase, 'pl-9']"
        />
      </div>
      <p class="text-muted m-0 text-xs">{{ t('predict.pool.help') }}</p>
      <p v-if="!groups.length" class="text-muted m-0 py-6 text-center text-sm" role="status">
        {{ query ? t('predict.pool.noMatch', { q: query }) : t('predict.pool.empty') }}
      </p>
      <section v-for="g in groups" :key="g.id" :aria-label="g.label" class="flex flex-col gap-1">
        <h3
          class="text-muted m-0 flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase"
        >
          <span
            aria-hidden="true"
            class="h-3 w-1 rounded-full"
            :class="!g.color && 'bg-series-rest'"
            :style="g.color ? { backgroundColor: g.color } : undefined"
          />
          {{ g.label }}
        </h3>
        <ul class="m-0 flex list-none flex-col gap-1 p-0">
          <li v-for="d in g.drivers" :key="d.id">
            <button
              type="button"
              :draggable="!disabled"
              :disabled="disabled"
              :data-driver="driverCode(d)"
              :class="[
                'text-body hover:ring-focus-ring ring-border relative flex min-h-11 w-full cursor-grab items-center gap-2 overflow-hidden rounded-md pr-2.5 pl-3.5 text-left ring-1 hover:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
                focusRing,
                used.has(d.id) ? 'bg-surface-muted' : 'bg-surface',
              ]"
              :aria-label="
                used.has(d.id)
                  ? t('predict.pool.rowUsed', {
                      driver: driverName(d),
                      place: formatOrdinal(used.get(d.id)!),
                    })
                  : t('predict.pool.row', { driver: driverName(d) })
              "
              @click="emit('pick', d.id)"
              @dragstart="onDragStart($event, d)"
            >
              <span
                aria-hidden="true"
                class="absolute inset-y-0 left-0 w-1"
                :class="!teamColor(d) && 'bg-series-rest'"
                :style="teamColor(d) ? { backgroundColor: teamColor(d) } : undefined"
              />
              <span aria-hidden="true" class="text-muted w-8 shrink-0 text-[11px] tabular-nums">
                {{ grid.has(d.id) ? t('gp.grid.position', { n: grid.get(d.id) }) : '' }}
              </span>
              <span
                v-if="d.number != null"
                aria-hidden="true"
                class="inline-flex min-w-7 shrink-0 justify-center rounded px-1 text-[11px] font-bold tabular-nums"
                :class="[dorsal(d), !teamColor(d) && 'bg-series-rest']"
                :style="teamColor(d) ? { backgroundColor: teamColor(d) } : undefined"
                >{{ d.number }}</span
              >
              <b aria-hidden="true" class="text-heading w-9 shrink-0 text-sm">{{
                driverCode(d)
              }}</b>
              <span aria-hidden="true" class="min-w-0 flex-1 truncate text-[13px]">{{
                driverName(d)
              }}</span>
              <span
                v-if="used.has(d.id)"
                aria-hidden="true"
                class="text-tint-fg shrink-0 text-xs font-bold"
                >{{ formatOrdinal(used.get(d.id)!) }}</span
              >
            </button>
          </li>
        </ul>
      </section>
    </div>
  </PCard>
</template>
