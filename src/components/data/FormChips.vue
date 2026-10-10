<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PTooltip from '@/components/ui/PTooltip.vue'
import { formatOrdinal } from '@/utils/numbers'

const props = withDefaults(
  defineProps<{
    /** Finishing place in each of the last five GPs (oldest first). */
    places: number[]
    /** Standings movement since the last GP (positive = up). */
    move?: number
    /** Optional GP names («Italia») used in the accessible name of each chip. */
    gps?: string[]
  }>(),
  { move: 0, gps: () => [] },
)

const { t } = useI18n()

type ChipKind = 'won' | 'podium' | 'rest'
const chips = computed(() =>
  props.places.map((place, i) => {
    const kind: ChipKind = place === 1 ? 'won' : place <= 3 ? 'podium' : 'rest'
    const gp = props.gps[i] ? `GP de ${props.gps[i]}` : t('data.form.gp', { n: i + 1 })
    return { place, kind, name: t('data.form.chip', { gp, place: formatOrdinal(place) }) }
  }),
)

const moveText = computed(() => {
  const m = Math.round(props.move)
  if (m > 0) return t('data.form.up', { n: m }, m)
  if (m < 0) return t('data.form.down', { n: -m }, -m)
  return t('data.form.same')
})
const moveGlyph = computed(() => {
  const m = Math.round(props.move)
  return m > 0 ? `▲${m}` : m < 0 ? `▼${-m}` : '—'
})
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <ul class="m-0 flex list-none gap-1 p-0" :aria-label="t('data.form.label')">
      <PTooltip v-for="(c, i) in chips" :key="i" :content="c.name">
        <li
          tabindex="0"
          :aria-label="c.name"
          :data-kind="c.kind"
          class="focus-visible:outline-focus-ring inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2"
          :class="{
            'bg-primary text-on-primary': c.kind === 'won',
            'bg-tint text-tint-fg': c.kind === 'podium',
            'bg-surface-muted text-body': c.kind === 'rest',
          }"
        >
          <span aria-hidden="true">{{ c.place }}</span>
        </li>
      </PTooltip>
    </ul>
    <span
      class="text-sm font-semibold tabular-nums"
      :class="{
        'text-ok-fg': move > 0,
        'text-err-fg': move < 0,
        'text-muted': move === 0,
      }"
    >
      <span aria-hidden="true">{{ moveGlyph }}</span>
      <span class="sr-only">{{ moveText }}</span>
    </span>
  </span>
</template>
