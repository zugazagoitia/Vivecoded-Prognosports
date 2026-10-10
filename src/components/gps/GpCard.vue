<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import type { GrandPrix } from '@/api/schemas'
import PTag from '@/components/ui/PTag.vue'
import { focusRing } from '@/components/ui/styles'
import { isSprintWeekend } from '@/lib/circuits'
import {
  formatPoints,
  gpDate,
  rankTagClass,
  roundDateLabel,
  type GpScore,
  type PredictionDots as Dots,
} from '@/lib/gps'
import PredictionDots from './PredictionDots.vue'

export type GpStatus = 'played' | 'current' | 'upcoming' | 'suspended'

const props = defineProps<{
  gp: GrandPrix
  competition: string | number
  season: string | number
  status: GpStatus
  tz?: string
  /** Own points and position in this GP (played GPs; null when unknown or the call failed). */
  score?: GpScore | null
  /** Own predictions of the current GP; null while unknown. */
  dots?: Dots | null
}>()
const { t } = useI18n()

const to = computed(() => `/gps/${props.competition}/${props.season}/${props.gp.id}`)
const sprint = computed(() => isSprintWeekend(props.gp))
const dateLabel = computed(() => {
  const date = gpDate(props.gp)
  if (date != null) return roundDateLabel(props.gp.round, date, props.tz)
  const none = t('gps.noDate')
  return props.gp.round != null ? `R${props.gp.round} · ${none}` : none
})
const circuitLine = computed(() =>
  [props.gp.circuit?.name, props.gp.circuit?.locality].filter(Boolean).join(' · '),
)
const ariaLabel = computed(() => {
  const base = { name: props.gp.name, round: props.gp.round ?? '' }
  const s = props.status === 'played' ? props.score : null
  return s
    ? t('gps.cardLabelPoints', {
        ...base,
        points: formatPoints(s.points),
        rank: t('gps.rankLabel', { n: s.rank, total: s.total }, s.total),
      })
    : t('gps.cardLabel', base)
})
</script>

<template>
  <RouterLink
    :to="to"
    :aria-label="ariaLabel"
    :class="[
      'text-body flex h-full w-full min-w-0 flex-col gap-2 rounded-lg p-4 no-underline',
      status === 'upcoming' || status === 'suspended'
        ? 'bg-surface-muted ring-border ring-1'
        : 'bg-surface ring-card-ring shadow-(--card-shadow) ring-1',
      status === 'current'
        ? 'shadow-[var(--card-shadow),0_0_0_2px_var(--color-focus-ring)]'
        : 'hover:shadow-[var(--card-shadow),0_0_0_2px_var(--color-focus-ring)]',
      focusRing,
    ]"
  >
    <span class="flex min-h-6 items-center justify-between gap-2">
      <span class="text-muted text-xs font-bold tracking-wide uppercase">{{ dateLabel }}</span>
      <PTag v-if="sprint" color="info">{{ t('gps.sprint') }}</PTag>
    </span>
    <b class="text-heading text-xl leading-7 font-bold">{{ gp.name }}</b>
    <span class="text-muted text-sm break-words">{{ circuitLine }}</span>

    <span
      class="border-border mt-auto flex min-h-8 items-center justify-between gap-2 border-t pt-2"
    >
      <template v-if="status === 'suspended'">
        <span class="text-muted text-xs">{{ t('gps.suspendedText') }}</span>
        <PTag color="gray">{{ t('gps.suspended') }}</PTag>
      </template>
      <template v-else-if="status === 'played'">
        <template v-if="score">
          <span>
            <b class="text-heading text-xl font-bold tabular-nums">{{
              formatPoints(score.points)
            }}</b>
            <span class="text-muted ml-1 text-xs">{{ t('gps.pts') }}</span>
          </span>
          <PTag :color="rankTagClass(score.rank)">{{ t('gps.rank', { n: score.rank }) }}</PTag>
        </template>
        <span v-else class="text-muted text-xs">{{ t('gps.noPoints') }}</span>
      </template>
      <template v-else-if="status === 'current'">
        <template v-if="dots">
          <PredictionDots :dots="dots" />
          <PTag color="warn">{{
            t('gps.doneOf', { done: dots.done, total: dots.states.length })
          }}</PTag>
        </template>
      </template>
      <span v-else class="text-muted text-xs">{{ t('gps.upcomingText') }}</span>
    </span>
  </RouterLink>
</template>
