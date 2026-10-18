<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import PCard from '@/components/ui/PCard.vue'
import type { GrandPrix, RaceSession } from '@/api/schemas'
import { adminGpPath } from '@/lib/adminGp'
import { sessionLabel } from '@/lib/gp'
import { sessionKind } from '@/lib/publicData/mapping'
import {
  dayOf,
  publicTasks,
  type PublicTask,
  type TaskGp,
  type TaskSession,
} from '@/lib/publicData/tasks'
import { useSessionGrid, useSessionResults } from '@/queries/admin'
import { publicSessionKind, usePublicAvailability } from '@/queries/publicCrossCheck'
import type { SessionRequest } from '@/lib/publicData/types'

/**
 * «Tareas con datos públicos» (issue 205, admin home): derived from the calendar and the saved data,
 * plus the public source's availability for yesterday's results. Rules in `lib/publicData/tasks`.
 */
const props = defineProps<{
  comp: string | number
  season?: string | number
  next?: GrandPrix
  previous?: GrandPrix
  now: number
}>()
const { t } = useI18n()
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const today = computed(() => dayOf(new Date(props.now).toISOString(), timeZone))
const yesterday = computed(() => dayOf(new Date(props.now - 86_400_000).toISOString(), timeZone))

// Yesterday's session the public source can answer for (race, qualifying or sprint).
const candidate = computed<RaceSession | undefined>(() =>
  props.previous?.sessions?.find(
    (s) => sessionKind(s) && dayOf(s.date, timeZone) === yesterday.value,
  ),
)
const candidateResults = useSessionResults(
  () => props.comp,
  () => props.season,
  () => props.previous?.id,
  () => candidate.value?.id,
)
const resultsSaved = computed(() => (candidateResults.data.value?.length ?? 0) > 0)
const fetchedSaved = computed(() => candidateResults.data.value != null)

const previousYear = computed(() => Number(props.previous?.season?.name) || undefined)
const request = computed<SessionRequest | undefined>(() => {
  const s = candidate.value
  const k = s && sessionKind(s)
  if (!s || !k || !fetchedSaved.value || resultsSaved.value) return undefined
  if (previousYear.value == null || props.previous?.round == null) return undefined
  return { season: previousYear.value, round: props.previous.round, kind: publicSessionKind(k) }
})
const availability = usePublicAvailability(request)

// Grid of today's session of the next GP (only sessions that have a grid).
const gridSession = computed<RaceSession | undefined>(() =>
  props.next?.sessions?.find((s) => s.hasGrid && dayOf(s.date, timeZone) === today.value),
)
const gridQ = useSessionGrid(
  () => props.comp,
  () => props.season,
  () => props.next?.id,
  () => gridSession.value?.id,
)
const gridSaved = computed(() => (gridQ.data.value?.length ?? 0) > 0)

const toTask = (s: RaceSession, extra: Partial<TaskSession> = {}): TaskSession => ({
  id: s.id,
  name: s.name ?? '',
  code: s.code ?? '',
  date: s.date ?? null,
  hasGrid: !!s.hasGrid,
  resultsSaved: false,
  gridSaved: false,
  ...extra,
})
const previousTask = computed<TaskGp | undefined>(() =>
  props.previous
    ? {
        id: props.previous.id,
        name: props.previous.name,
        sessions: (props.previous.sessions ?? []).map((s) =>
          toTask(s, { resultsSaved: s.id === candidate.value?.id && resultsSaved.value }),
        ),
      }
    : undefined,
)
const nextTask = computed<TaskGp | undefined>(() =>
  props.next
    ? {
        id: props.next.id,
        name: props.next.name,
        sessions: (props.next.sessions ?? []).map((s) =>
          toTask(s, { gridSaved: s.id === gridSession.value?.id && gridSaved.value }),
        ),
      }
    : undefined,
)

const tasks = computed<PublicTask[]>(() =>
  publicTasks({
    now: props.now,
    timeZone,
    previous: previousTask.value,
    next: nextTask.value,
    availableInSource:
      availability.value === 'available' && candidate.value
        ? new Set([candidate.value.id])
        : new Set<number>(),
  }),
)

function textOf(task: PublicTask) {
  const session = sessionLabel(task.session).long
  if (task.kind === 'resultAvailable') {
    return {
      title: t('publicCrossCheck.publicCrossCheck.tasks.resultAvailable', { session }),
      detail: t('publicCrossCheck.publicCrossCheck.tasks.resultAvailableDetail', {
        gp: task.gp.name,
      }),
    }
  }
  if (task.kind === 'gridToday') {
    return {
      title: t('publicCrossCheck.publicCrossCheck.tasks.gridToday', { session }),
      detail: t('publicCrossCheck.publicCrossCheck.tasks.gridTodayDetail', { gp: task.gp.name }),
    }
  }
  return {
    title: t('publicCrossCheck.publicCrossCheck.tasks.sessionNoTime', { session }),
    detail: t('publicCrossCheck.publicCrossCheck.tasks.sessionNoTimeDetail', { gp: task.gp.name }),
  }
}
const pathOf = (task: PublicTask) => {
  const gp = task.gp.id === props.previous?.id ? props.previous : props.next
  return gp ? adminGpPath(gp, { competition: props.comp, season: props.season }) : '/admin'
}
</script>

<template>
  <PCard v-if="tasks.length" :title="t('publicCrossCheck.publicCrossCheck.tasks.title')">
    <ul class="m-0 flex list-none flex-col gap-3 p-0">
      <li v-for="(task, i) in tasks" :key="i">
        <RouterLink
          :to="pathOf(task)"
          class="flex min-w-0 flex-col no-underline hover:no-underline"
        >
          <b class="text-heading text-sm">{{ textOf(task).title }}</b>
          <span class="text-muted text-xs">{{ textOf(task).detail }}</span>
        </RouterLink>
      </li>
    </ul>
  </PCard>
</template>
