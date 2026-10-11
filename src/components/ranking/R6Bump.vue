<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Tone } from '@/components/charts/model'
import { EmptyState } from '@/components/states'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { compactMovement, firstName } from '@/lib/ranking'
import { focusSet, standingAt, toggleCustom, type Focus } from '@/lib/rankingEvolution'
import type { Ranking } from '@/queries/ranking'
import GpAxis from './GpAxis.vue'
import RankCard from './RankCard.vue'
import RankLineChart from './RankLineChart.vue'
import type { LineSeries } from './chartTypes'

/** R6 · Posición en la general (flag BUMP): bump chart, foco, resaltado manual y panel. */
const props = defineProps<{ rk: Ranking }>()
const { t } = useI18n()
const model = computed(() => props.rk.model.value!)
const n = computed(() => model.value.played.length)
const players = computed(() => model.value.players)
const meId = computed(() => model.value.me?.id)

const focus = ref<Focus>('top')
const custom = ref<number[] | null>(null)
const shape = ref<'curve' | 'line'>('curve')
const curve = computed(() => shape.value === 'curve')
const sel = ref(Math.max(0, n.value - 1))
const focusOptions = computed(() =>
  (['top', 'near', 'all'] as const).map((f) => ({ value: f, label: t(`ranking.r6.focus.${f}`) })),
)
const shapeOptions = computed(() => [
  { value: 'curve' as const, label: t('ranking.r6.curves') },
  { value: 'line' as const, label: t('ranking.r6.lines') },
])
const hl = computed(() => custom.value ?? focusSet(focus.value, players.value, meId.value))
const setFocus = (f: Focus) => {
  focus.value = f
  custom.value = null
}
function toggle(id: number) {
  custom.value = toggleCustom(hl.value, id, meId.value)
}

const toneOf = (id: number): Tone => {
  if (id === meId.value) return 'you'
  const i = hl.value.indexOf(id)
  if (i < 0) return 'rest'
  return focus.value === 'all' && !custom.value
    ? 'rest'
    : (['s2', 's3', 's4', 's5', 's6'] as Tone[])[i % 5]!
}
const toneBg: Record<string, string> = {
  you: 'bg-series-you',
  s2: 'bg-series-2',
  s3: 'bg-series-3',
  s4: 'bg-series-4',
  s5: 'bg-series-5',
  s6: 'bg-series-6',
  rest: 'bg-series-rest',
}
const placeLabel = (p: number) => `${p}.º`
const series = computed<LineSeries[]>(() => {
  const mk = (p: (typeof players.value)[number]): LineSeries => {
    const on = p.id === meId.value || hl.value.includes(p.id)
    const tone = toneOf(p.id)
    return {
      id: p.id,
      label: p.you ? t('ranking.you') : firstName(p.name),
      tone: on ? tone : 'rest',
      width: p.you ? 4 : on ? 2.5 : 1.2,
      opacity: on ? 1 : 0.6,
      values: p.places,
      end: on ? String(p.pos) : undefined,
    }
  }
  const all = players.value.map(mk)
  return [
    ...all.filter((s) => !hl.value.includes(Number(s.id)) && s.id !== meId.value),
    ...all.filter((s) => hl.value.includes(Number(s.id))),
    ...all.filter((s) => s.id === meId.value),
  ]
})
const ticks = computed(() =>
  Array.from({ length: players.value.length }, (_, i) => ({ v: i + 1, label: placeLabel(i + 1) })),
)
const panel = computed(() => standingAt(players.value, sel.value))
const W = 1000
const PL = 56
const PR = 150
</script>

<template>
  <RankCard v-if="n >= 2" :title="t('ranking.r6.title')" :subtitle="t('ranking.r6.subtitle')" flag>
    <template #controls>
      <SegmentedControl
        :model-value="custom ? '' : focus"
        :options="focusOptions"
        :label="t('ranking.r6.focusLabel')"
        @update:model-value="setFocus($event as Focus)"
      />
      <SegmentedControl v-model="shape" :options="shapeOptions" :label="t('ranking.r6.shape')" />
    </template>
    <div class="grid items-start gap-5 min-[1001px]:grid-cols-[minmax(0,1fr)_280px]">
      <RankLineChart
        :series="series"
        :x-codes="model.played.map((g) => g.code)"
        :x-names="model.played.map((g) => g.name)"
        :domain="[1, Math.max(2, players.length)]"
        :ticks="ticks"
        :invert="true"
        :curve="curve"
        :guide="sel"
        end-style="circle"
        :label-gap="22"
        :width="W"
        :height="440"
        :pad-left="PL"
        :pad-right="PR"
        :label="t('ranking.r6.aria')"
        :cell="placeLabel"
      >
        <template #below>
          <GpAxis
            v-model="sel"
            :codes="model.played.map((g) => g.code)"
            :names="model.played.map((g) => g.name)"
            :width="W"
            :pad-left="PL"
            :pad-right="PR"
          />
        </template>
      </RankLineChart>
      <aside
        class="border-border flex flex-col gap-0.5 min-[1001px]:border-l min-[1001px]:pl-4"
        aria-live="polite"
      >
        <span class="t-up text-muted mb-1.5">{{
          t('ranking.r6.after', { name: model.played[sel]?.name })
        }}</span>
        <ol class="m-0 flex list-none flex-col gap-0.5 p-0">
          <li
            v-for="r in panel"
            :key="r.player.id"
            class="flex items-center gap-2 rounded px-1.5 py-1 text-[13px]"
            :class="r.player.you ? 'bg-tint font-bold' : ''"
          >
            <span class="text-muted w-5 tabular-nums">{{ r.place }}</span>
            <span
              class="size-2 rounded-full"
              :class="
                toneBg[
                  r.player.id === meId || hl.includes(r.player.id) ? toneOf(r.player.id) : 'rest'
                ]
              "
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate"
              >{{ r.player.name
              }}{{ r.player.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}</span
            >
            <span class="text-xs font-bold" :class="r.move > 0 ? 'text-ok-fg' : 'text-err-fg'">{{
              compactMovement(r.move)
            }}</span>
            <span class="w-9 text-right tabular-nums">{{ r.acc }}</span>
          </li>
        </ol>
      </aside>
    </div>
    <template #footer>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="t-up mr-1.5">{{ t('ranking.r6.highlight') }}</span>
        <button
          v-for="p in players"
          :key="p.id"
          type="button"
          :aria-pressed="p.you || hl.includes(p.id)"
          :aria-disabled="p.you || undefined"
          class="border-border-input bg-surface text-body hover:bg-surface-muted aria-pressed:bg-tint aria-pressed:border-focus-ring aria-pressed:text-tint-fg focus-visible:outline-focus-ring inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 aria-pressed:font-semibold"
          @click="!p.you && toggle(p.id)"
        >
          <span
            class="size-2 rounded-full"
            :class="toneBg[p.you || hl.includes(p.id) ? toneOf(p.id) : 'rest']"
            aria-hidden="true"
          />
          {{ p.name }}{{ p.you ? ` (${t('ranking.you').toLowerCase()})` : '' }}
        </button>
      </div>
    </template>
  </RankCard>
  <RankCard v-else :title="t('ranking.r6.title')" flag>
    <EmptyState icon="schedule" :title="t('ranking.r5.fewTitle')" :text="t('ranking.r5.fewText')" />
  </RankCard>
</template>
