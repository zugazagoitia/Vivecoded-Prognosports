<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/data/BottomSheet.vue'
import SaveBar from '@/components/data/SaveBar.vue'
import ValidationList from '@/components/data/ValidationList.vue'
import type { ValidationItem } from '@/components/data/types'
import PIcon from '@/components/ui/PIcon.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { focusRing } from '@/components/ui/styles'
import { driverCode, driverName, groupDrivers } from '@/lib/predict'
import { formatNumber, formatOrdinal } from '@/utils/numbers'
import type { PredictVm } from './usePredict'

/**
 * Phone version of the slots: tap a slot to open the bottom sheet «Elige el N.º»; picking a
 * driver moves on to the next empty slot and closes the sheet when full. No drag, no reorder
 * buttons (to change a place, open it and pick another driver).
 */
const props = defineProps<{ vm: PredictVm; readonly?: boolean }>()
const { t } = useI18n()

const d = computed(() => props.vm.draft)
const order = ref<'grid' | 'team'>('grid')
const orderOptions = computed(() => [
  { value: 'grid' as const, label: t('predict.pool.byGrid') },
  { value: 'team' as const, label: t('predict.pool.byTeam') },
])
const open = computed({
  get: () => props.vm.sheet >= 0,
  set: (v: boolean) => {
    if (!v) props.vm.closeSheet()
  },
})
const sheetTitle = computed(() =>
  t('predict.mobile.choose', { place: formatOrdinal(props.vm.sheet + 1) }),
)
const groups = computed(() =>
  groupDrivers(props.vm.pool, order.value === 'team' ? 'team' : 'grid', props.vm.gridPos, '', {
    grid: t('predict.pool.gridGroup'),
    no: t('predict.pool.numberGroup'),
    noTeam: t('predict.pool.noTeam'),
  }),
)
const items = computed<ValidationItem[]>(() => {
  const out: ValidationItem[] = props.vm.hardIssues
    .filter((i) => i.key !== 'closed')
    .map((i) => ({ label: t(`predict.validation.${i.key}`), state: 'err' as const }))
  if (props.vm.saveError) out.push({ label: props.vm.saveError, state: 'err' })
  return out
})
const message = computed(() =>
  props.vm.missing > 0
    ? t('predict.missing', { n: formatNumber(props.vm.missing) }, props.vm.missing)
    : t('predict.ready'),
)
/** The picked button gets disabled when the sheet moves on: keep the focus (and Escape) in it. */
async function pickMobile(id: number) {
  props.vm.pickMobile(id)
  await nextTick()
  if (props.vm.sheet >= 0) document.querySelector<HTMLElement>('[role="dialog"]')?.focus()
}
const savedNow = computed(() => d.value.saved && !d.value.dirty)
const slotLabel = (i: number) => {
  const id = d.value.sel[i] ?? null
  const driver = props.vm.slotDriver(id, false)
  return driver
    ? t('predict.mobile.slotFilled', { place: formatOrdinal(i + 1), driver: driver.name })
    : t('predict.mobile.slotEmpty', { place: formatOrdinal(i + 1) })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-baseline justify-between gap-3 text-sm">
      <h2 class="text-muted m-0 text-sm font-normal">
        {{
          readonly
            ? t('predict.slots.title', { session: vm.label?.long.toLocaleLowerCase('es') })
            : t('predict.mobile.hint')
        }}
      </h2>
      <span class="tabular-nums"
        ><b class="text-heading">{{ vm.chosen }}</b
        ><span class="text-muted">/{{ vm.n }}</span></span
      >
    </div>
    <ProgressBar :value="vm.chosen" :max="vm.n" :label="t('predict.slots.progress')" />
    <PrognoAlert v-if="readonly" variant="warn" :title="t('predict.closedLive.title')">
      {{ t('predict.closedLive.keep') }}
    </PrognoAlert>
    <PrognoAlert
      v-else-if="vm.recovered && d.dirty"
      variant="info"
      :title="t('predict.recovered.title')"
    >
      {{ t('predict.recovered.text') }}
    </PrognoAlert>

    <ol class="m-0 flex list-none flex-col gap-2 p-0">
      <li v-for="(id, i) in d.sel" :key="i">
        <button
          type="button"
          :disabled="readonly"
          :aria-label="slotLabel(i)"
          :data-position="i + 1"
          :class="[
            'bg-surface flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg border-2 px-3 text-left disabled:cursor-default',
            focusRing,
            id == null ? 'border-border-input border-dashed' : 'border-border',
            vm.sheet === i && 'border-focus-ring bg-tint',
          ]"
          @click="vm.openSlot(i)"
        >
          <span
            aria-hidden="true"
            class="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
            :class="id == null ? 'bg-surface-muted text-muted' : 'bg-primary text-on-primary'"
            >{{ i + 1 }}</span
          >
          <template v-if="vm.slotDriver(id, false)">
            <span
              aria-hidden="true"
              class="h-[26px] w-1 shrink-0 rounded-full"
              :style="{
                backgroundColor: vm.slotDriver(id)?.teamColor ?? 'var(--color-series-rest)',
              }"
            />
            <span class="min-w-0 flex-1" aria-hidden="true">
              <b class="text-heading block truncate text-[15px]">{{ vm.slotDriver(id)?.name }}</b>
              <span class="text-muted block truncate text-xs">{{
                vm.slotDriver(id)?.subtitle
              }}</span>
            </span>
          </template>
          <span v-else class="text-muted min-w-0 flex-1 text-[15px]" aria-hidden="true">{{
            t('predict.mobile.pick')
          }}</span>
          <PIcon v-if="!readonly" name="chevron-right" :size="16" class="text-muted" />
        </button>
      </li>
    </ol>
    <ValidationList v-if="items.length" :items="items" />

    <BottomSheet v-model:open="open" :title="sheetTitle">
      <div class="flex flex-col gap-3 pb-2">
        <SegmentedControl
          v-model="order"
          :options="orderOptions"
          :label="t('predict.mobile.order')"
        />
        <p v-if="vm.pool.length === 0" class="text-muted m-0 py-6 text-center text-sm">
          {{ t('predict.mobile.noDrivers') }}
        </p>
        <section
          v-for="g in groups"
          :key="g.id"
          :aria-label="g.label"
          class="flex flex-col gap-1.5"
        >
          <h3
            v-if="groups.length > 1"
            class="text-muted m-0 text-[11px] font-semibold tracking-wide uppercase"
          >
            {{ g.label }}
          </h3>
          <ul class="m-0 grid list-none grid-cols-4 gap-1.5 p-0">
            <li v-for="dr in g.drivers" :key="dr.id">
              <button
                type="button"
                :disabled="vm.used.has(dr.id) && vm.used.get(dr.id) !== vm.sheet + 1"
                :aria-label="driverName(dr)"
                :aria-pressed="vm.used.get(dr.id) === vm.sheet + 1"
                :class="[
                  'bg-surface text-heading border-border relative flex min-h-[52px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border text-sm font-bold disabled:opacity-40',
                  focusRing,
                  vm.used.get(dr.id) === vm.sheet + 1 && 'bg-tint border-focus-ring',
                ]"
                @click="pickMobile(dr.id)"
              >
                <span
                  aria-hidden="true"
                  class="absolute inset-x-0 top-0 h-1"
                  :style="{
                    backgroundColor: dr.team?.teamcolor
                      ? dr.team.teamcolor
                      : (dr.color ?? 'var(--color-series-rest)'),
                  }"
                />
                {{ driverCode(dr) }}
                <small class="text-muted text-[10px] font-normal" aria-hidden="true">{{
                  vm.used.has(dr.id)
                    ? formatOrdinal(vm.used.get(dr.id)!)
                    : vm.gridPos.has(dr.id)
                      ? t('gp.grid.position', { n: vm.gridPos.get(dr.id) })
                      : '&nbsp;'
                }}</small>
              </button>
            </li>
          </ul>
        </section>
        <p class="text-muted m-0 text-xs">{{ t('predict.mobile.sheetNote') }}</p>
      </div>
    </BottomSheet>

    <SaveBar
      v-if="!readonly"
      variant="surface"
      position="static"
      always
      stack
      :count="vm.changes"
      :message="message"
      :discard-label="t('predict.slots.clear')"
      :save-label="
        vm.saving
          ? t('predict.slots.saving')
          : savedNow
            ? t('predict.slots.saved')
            : t('predict.slots.save')
      "
      :saving="vm.saving"
      :can-save="vm.canSave"
      class="sticky bottom-20 z-30"
      data-bottom-bar
      @discard="vm.clearAll()"
      @save="vm.submit()"
    />
  </div>
</template>
