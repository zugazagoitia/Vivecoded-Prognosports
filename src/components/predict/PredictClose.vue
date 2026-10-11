<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GpCard from '@/components/gp/GpCard.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PTag from '@/components/ui/PTag.vue'
import { formatCountdown } from '@/utils/dates'

/** «Cierre»: live countdown to the deadline (session - 5 min), its date and the privacy note. */
const props = defineProps<{
  /** ms to the deadline. */
  closesIn: number
  day?: string
  time?: string
  soon: boolean
  /** Phone: compact card, «Cierra el {sesión} en». */
  mobile?: boolean
  sessionName?: string
}>()
const { t } = useI18n()

const countdown = computed(() => formatCountdown(props.closesIn / 1000))
/** «Sábado 10 de octubre» -> «Sáb 10». */
const shortDay = computed(() => {
  const [w = '', d = ''] = (props.day ?? '').split(' ')
  return `${w.slice(0, 3)} ${d}`
})
// One announcement per minute for assistive tech, not one per second.
const minuteLabel = computed(() =>
  t('predict.close.remaining', { time: formatCountdown(Math.floor(props.closesIn / 60_000) * 60) }),
)
</script>

<template>
  <GpCard v-if="!mobile" :title="t('predict.close.title')">
    <template #aside>
      <PTag v-if="soon" color="warn" icon="clock">{{ t('predict.close.soon') }}</PTag>
    </template>
    <div class="flex flex-col gap-2">
      <b
        class="text-heading text-3xl font-bold tabular-nums"
        role="timer"
        :aria-label="minuteLabel"
        >{{ countdown }}</b
      >
      <p v-if="day" class="text-muted m-0 text-sm">
        {{ t('predict.close.when', { day, time }) }}
      </p>
      <PrognoAlert variant="info" :title="t('predict.privacy')" />
    </div>
  </GpCard>
  <div v-else class="flex flex-col gap-1">
    <div
      class="bg-surface ring-card-ring flex items-center justify-between gap-3 rounded-lg px-3.5 py-3 shadow-(--card-shadow) ring-1"
    >
      <span class="text-muted text-xs">{{
        t('predict.close.mobile', { session: sessionName })
      }}</span>
      <b
        class="text-warn-fg text-[22px] font-bold tabular-nums"
        role="timer"
        :aria-label="minuteLabel"
        >{{ countdown }}</b
      >
      <span v-if="day" class="text-muted text-right text-xs">{{
        t('predict.close.mobileWhen', { day: shortDay, time })
      }}</span>
    </div>
  </div>
</template>
