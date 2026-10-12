<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNow } from '@/composables/useNow'
import { closesAt, formatCountdown, type HasDate } from '@/utils/dates'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import { sessionState } from './sessionState'

const props = defineProps<{
  session: HasDate
  /** Ver `sessionState`: las pantallas lo derivan de la consulta de resultados. */
  hasResults?: boolean
  /** Reloj inyectable (ms); por defecto, reloj vivo. */
  now?: number
}>()
const { t } = useI18n()
const clock = useNow()
const current = computed(() => props.now ?? clock.value)
const state = computed(() => sessionState(props.session, current.value, props.hasResults))
const time = computed(() => {
  const c = closesAt(props.session)
  return c ? formatCountdown((c.getTime() - current.value) / 1000) : ''
})
const KIND = { open: 'warn', closed: 'info', scored: 'ok' } as const
</script>

<template>
  <!-- role="status": the countdown ticks, so it must not be an assertive alert. -->
  <PrognoAlert
    role="status"
    :variant="KIND[state]"
    :title="t(`states.session.${state}.title`, { time })"
  >
    {{ t(`states.session.${state}.text`) }}
  </PrognoAlert>
</template>
