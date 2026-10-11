<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import type { GrandPrix } from '@/api/schemas'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'
import { useNow } from '@/composables/useNow'
import { sessionName } from '@/i18n/sessions'
import {
  closeTime,
  formatCountdown,
  predictionDots,
  sortSessions,
  type PredictionDots as Dots,
} from '@/lib/gps'
import PredictionDots from './PredictionDots.vue'

/** Highlighted band of the GP in progress: whole band links to its weekend (G2). */
const props = defineProps<{
  gp: GrandPrix
  competition: string | number
  season: string | number
  /** Own prediction per session id; only trusted when `ready`. */
  done: Record<number, boolean>
  ready: boolean
}>()
const { t } = useI18n()
const now = useNow(1000)

const sessions = computed(() => sortSessions(props.gp.sessions))
const dots = computed<Dots>(() =>
  predictionDots(
    sessions.value.map((s) => ({
      done: props.ready && props.done[s.id] === true,
      open: closeTime(s) > now.value,
    })),
  ),
)
/** Next session still open and without prediction (else the next open one). */
const next = computed(() => {
  const open = sessions.value.filter((s) => closeTime(s) > now.value)
  return open.find((s) => !props.done[s.id] || !props.ready) ?? open[0]
})
const sessionLabel = computed(() => {
  const s = next.value
  const n = s ? (sessionName(s.code ?? '') ?? sessionName(s.name ?? '')) : null
  return n ? `${n.article} ${n.long.toLowerCase()}` : (s?.name ?? '')
})
const countdown = computed(() =>
  next.value ? formatCountdown((closeTime(next.value) - now.value) / 1000) : '',
)
const to = computed(() => `/gps/${props.competition}/${props.season}/${props.gp.id}`)

const line = computed(() => {
  if (!next.value) return t('gps.band.closed')
  const closes = t('gps.band.closes', { session: sessionLabel.value, time: countdown.value })
  if (!props.ready) return closes
  const d = dots.value
  if (d.pending === 0) return `${closes} · ${t('gps.band.allDone')}`
  return `${closes} · ${t('gps.band.missing', { pending: d.pending, total: d.states.length }, d.pending)}`
})
</script>

<template>
  <RouterLink
    :to="to"
    :class="[
      'from-brand-700 to-brand-900 text-brand-50 flex flex-wrap items-center gap-4 rounded-lg bg-linear-135 px-5 py-4 no-underline',
      focusRing,
    ]"
  >
    <PIcon name="flag-checkered" :size="24" class="text-brand-200" />
    <span class="flex min-w-[220px] flex-1 flex-col gap-0.5">
      <span class="text-brand-200 text-xs font-semibold tracking-wide uppercase">{{
        t('gps.band.now', { round: gp.round ?? '' })
      }}</span>
      <b class="text-xl leading-7 font-bold text-white">{{ gp.name }}</b>
      <span class="text-brand-100 text-sm tabular-nums">{{ line }}</span>
    </span>
    <PredictionDots v-if="ready" :dots="dots" />
    <span
      class="text-brand-700 inline-flex min-h-11 items-center rounded-md bg-white px-5 text-base font-semibold"
      aria-hidden="true"
      >{{ t('gps.band.cta') }}</span
    >
  </RouterLink>
</template>
