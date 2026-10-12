<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  /** Closing instant. */
  target: Date | string | number
  /** Fixed "now" (tests, snapshots); otherwise ticks every second. */
  now?: Date | string | number
}>()
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()

const current = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (props.now !== undefined) return
  timer = setInterval(() => {
    current.value = Date.now()
    if (remaining.value <= 0) {
      clearInterval(timer)
      emit('done')
    }
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const remaining = computed(() => {
  const now = props.now !== undefined ? new Date(props.now).getTime() : current.value
  return Math.max(0, new Date(props.target).getTime() - now)
})
const parts = computed(() => {
  const s = Math.floor(remaining.value / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
})

/** «1 día y 4 horas»: the two largest non-zero units. */
const summary = computed(() => {
  const { d, h, m } = parts.value
  const units: string[] = []
  if (d) units.push(t('ui.countdown.days', { n: d }, d))
  if (h) units.push(t('ui.countdown.hours', { n: h }, h))
  if (!d && m) units.push(t('ui.countdown.minutes', { n: m }, m))
  const text = units.slice(0, 2).join(t('ui.countdown.and')) || t('ui.countdown.less')
  return remaining.value <= 0 ? t('ui.countdown.closed') : t('ui.countdown.closesIn', { text })
})

const cells = computed(() => [
  { key: 'd', value: parts.value.d, label: t('ui.countdown.d') },
  { key: 'h', value: parts.value.h, label: t('ui.countdown.h') },
  { key: 'm', value: parts.value.m, label: t('ui.countdown.m') },
  { key: 's', value: parts.value.s, label: t('ui.countdown.s') },
])
</script>

<template>
  <div role="timer" aria-live="off" :aria-label="summary" class="flex gap-2">
    <div
      v-for="c in cells"
      :key="c.key"
      aria-hidden="true"
      class="bg-surface-muted ring-border min-w-14 rounded-md p-2 text-center ring-1"
    >
      <b class="text-heading block text-[22px] leading-[26px] font-bold tabular-nums">{{
        String(c.value).padStart(2, '0')
      }}</b>
      <span class="text-muted text-[11px] leading-4 font-semibold tracking-wide uppercase">{{
        c.label
      }}</span>
    </div>
  </div>
</template>
