<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PCard from '@/components/ui/PCard.vue'
import { formatPoints, ordinal } from '@/lib/gp'
import { gapToLeader, type StandingRow } from '@/lib/simulator'
import MovementMark from './MovementMark.vue'

/**
 * «Tus puntos»: total, exact hits, place in the session and in the general, gap to the leader.
 * A polite live region announces the settled figures once per calculation (not per key).
 */
const props = defineProps<{
  total: number
  max?: number
  exacts: number
  /** Place in the session among those who predicted; `undefined` before closing. */
  place?: number
  players: number
  me?: StandingRow
  leaderTotal: number
  recalculating: boolean
  /** The community's predictions are hidden (session still open). */
  locked: boolean
}>()
const { t } = useI18n()

const exactsText = computed(() => t('simulator.points.exacts', { n: props.exacts }, props.exacts))
const sub = computed(() =>
  props.max != null
    ? `${t('simulator.points.of', { max: formatPoints(props.max) })} · ${exactsText.value}`
    : exactsText.value,
)
const rankText = computed(() =>
  props.place != null
    ? t(
        'simulator.points.sessionRankOf',
        { rank: ordinal(props.place), n: props.players },
        props.players,
      )
    : t('simulator.points.unavailable'),
)
const generalText = computed(() =>
  props.me
    ? `${ordinal(props.me.beforePos)} → ${ordinal(props.me.afterPos)}`
    : t('simulator.points.unavailable'),
)

const announce = computed(() => {
  const rank =
    props.place != null
      ? t('simulator.announceRank', { rank: ordinal(props.place) })
      : t('simulator.points.unavailable')
  const general = props.me
    ? t('simulator.announceGeneral', {
        before: ordinal(props.me.beforePos),
        after: ordinal(props.me.afterPos),
      })
    : ''
  return t('simulator.announce', {
    points: formatPoints(props.total),
    exacts: exactsText.value,
    rank,
    general,
  })
})
const announced = ref('')
watch(
  [() => props.recalculating, announce],
  ([rec, text]) => {
    if (!rec) announced.value = text
  },
  { immediate: true },
)

const row = 'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px]'
</script>

<template>
  <PCard tag="section" :aria-busy="recalculating">
    <div class="flex flex-wrap gap-6" data-testid="sim-points">
      <div class="flex flex-col gap-1">
        <span class="text-muted text-xs font-semibold tracking-wide uppercase">{{
          t('simulator.points.label')
        }}</span>
        <b data-total class="text-heading text-[56px] leading-[60px] font-bold tabular-nums">{{
          formatPoints(total)
        }}</b>
        <span class="text-muted text-[13px]">{{ sub }}</span>
        <!-- Discreet indicator (no dimming: it would break the text contrast). -->
        <span class="text-muted min-h-4 text-xs" aria-hidden="true">{{
          recalculating ? t('simulator.points.recalculating') : ''
        }}</span>
      </div>
      <dl class="m-0 flex min-w-[200px] flex-1 flex-col justify-center gap-2">
        <div :class="row">
          <dt class="text-muted">{{ t('simulator.points.sessionRank') }}</dt>
          <dd data-session-rank class="text-heading m-0 font-semibold tabular-nums">
            {{ rankText }}
          </dd>
        </div>
        <div :class="row">
          <dt class="text-muted">{{ t('simulator.points.general') }}</dt>
          <dd data-general class="text-heading m-0 font-semibold tabular-nums">
            {{ generalText }}
            <MovementMark v-if="me" :mv="me.mv" class="ml-1" />
          </dd>
        </div>
        <div :class="row">
          <dt class="text-muted">{{ t('simulator.points.gap') }}</dt>
          <dd data-gap class="text-heading m-0 font-semibold tabular-nums">
            {{
              me && !locked ? gapToLeader(leaderTotal, me.total) : t('simulator.points.unavailable')
            }}
          </dd>
        </div>
      </dl>
    </div>
    <p role="status" aria-live="polite" class="sr-only" data-testid="sim-announce">
      {{ announced }}
    </p>
  </PCard>
</template>
