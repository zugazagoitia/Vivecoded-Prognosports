<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaceSession } from '@/api/schemas'
import { sessionLabel } from '@/lib/gp'
import { sessionKind } from '@/lib/publicData/mapping'
import type { SessionRequest } from '@/lib/publicData/types'
import { publicSessionKind, usePublicAvailability } from '@/queries/publicCrossCheck'
import { useSessionResults } from '@/queries/admin'

/**
 * «Resultados en la fuente pública» (issue 205, calculos): one finished session without results saved;
 * says whether the public source already has them. Read-only; the public source is asked only
 * here, on the admin calculations screen.
 */
const props = defineProps<{
  comp: string
  season: string
  /** Season year, for the public source (Jolpica numbering). */
  year: number | undefined
  gp: { id: number; round?: number | null }
  session: RaceSession
  now: number
}>()
const { t } = useI18n()

const kind = computed(() => sessionKind(props.session))
const finished = computed(() => {
  const at = Date.parse(props.session.date ?? '')
  return Number.isFinite(at) && at < props.now
})
const saved = useSessionResults(
  () => props.comp,
  () => props.season,
  () => props.gp.id,
  () => props.session.id,
)
const isSaved = computed(() => (saved.data.value?.length ?? 0) > 0)
const isFetched = computed(() => saved.data.value != null)

const request = computed<SessionRequest | undefined>(() => {
  const k = kind.value
  if (!k || !finished.value || !isFetched.value || isSaved.value) return undefined
  if (props.year == null || props.gp.round == null) return undefined
  return { season: props.year, round: props.gp.round, kind: publicSessionKind(k) }
})
const state = usePublicAvailability(request)

const text = computed(() => {
  if (isSaved.value) return t('publicCrossCheck.publicCrossCheck.availability.saved')
  const map = {
    idle: '',
    loading: 'publicCrossCheck.publicCrossCheck.availability.loading',
    available: 'publicCrossCheck.publicCrossCheck.availability.available',
    unavailable: 'publicCrossCheck.publicCrossCheck.availability.unavailable',
    error: 'publicCrossCheck.publicCrossCheck.availability.error',
  } as const
  const key = map[state.value]
  return key ? t(key) : ''
})
</script>

<template>
  <div v-if="kind && finished" class="flex flex-wrap items-center justify-between gap-2">
    <b class="text-heading text-sm">
      {{
        t('publicCrossCheck.publicCrossCheck.availability.session', {
          session: sessionLabel(session).long,
        })
      }}
    </b>
    <span class="text-muted text-sm" role="status">{{ text }}</span>
  </div>
</template>
