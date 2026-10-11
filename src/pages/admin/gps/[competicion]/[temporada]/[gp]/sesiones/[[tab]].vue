<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import SessionsCalendar from '@/components/admin/SessionsCalendar.vue'
import SessionsGrid from '@/components/admin/SessionsGrid.vue'
import SessionsResults from '@/components/admin/SessionsResults.vue'
import ConfirmLeaveDialog from '@/components/data/ConfirmLeaveDialog.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PTabs from '@/components/ui/PTabs.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { iconFor } from '@/components/ui/icons'
import { useAdminCrumbs } from '@/composables/useAdminCrumbs'
import { useNow } from '@/composables/useNow'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { SESSION_TABS, tabParam, type SessionTab } from '@/lib/adminSessions'
import {
  circuitTimeZone,
  formatDateRange,
  gpShortName,
  sortedSessions,
  userTimeZone,
  utcOffsetLabel,
} from '@/lib/gp'
import { useGpDrivers, useRulesets } from '@/queries/admin'
import { useGpDetail } from '@/queries/gp'
import { useSessionStore } from '@/stores/session'

/**
 * M5 · Sesiones de un GP (`/admin/gps/:competicion/:temporada/:gp/sesiones/:tab?`): Calendario,
 * Parrilla y Resultados. The session is in `?sesion=`; the circuit time zone is deduced from the
 * country (the API only has coordinates, por confirmar) and the toggle is hidden without one.
 */
definePage({ meta: { title: 'route.adminGpSessions' } })

const { t } = useI18n()
const route = useRoute('/admin/gps/[competicion]/[temporada]/[gp]/sesiones/[[tab]]')
const router = useRouter()
const session = useSessionStore()
const now = useNow(30_000)

const comp = computed(() => route.params.competicion)
const seasonId = computed(() => route.params.temporada)
const detail = useGpDetail(comp, seasonId, () => route.params.gp)
const gp = computed(() => detail.gp.value)
const drivers = useGpDrivers(comp, seasonId, () => gp.value?.id)
const rulesets = useRulesets()

const tab = computed<SessionTab>(() => tabParam(route.params.tab))
const sessions = computed(() => (gp.value ? sortedSessions(gp.value) : []))
const selectedId = computed(() => {
  const v = Number(Array.isArray(route.query.sesion) ? route.query.sesion[0] : route.query.sesion)
  return Number.isFinite(v) && v > 0 ? v : undefined
})
const adding = ref(route.query.nueva === '1')

const userTz = computed(() => userTimeZone(session.user?.timeZone))
const circuitTz = computed(() => circuitTimeZone(gp.value?.circuit))
const mode = ref<'circuit' | 'user'>('circuit')
const tz = computed(() =>
  mode.value === 'circuit' && circuitTz.value ? circuitTz.value : userTz.value,
)
const zoneOptions = computed(() => [
  ...(circuitTz.value
    ? [
        {
          value: 'circuit' as const,
          label: t('admin.sessions.zoneCircuit', {
            offset: utcOffsetLabel(circuitTz.value, now.value),
          }),
        },
      ]
    : []),
  {
    value: 'user' as const,
    label: t('admin.sessions.zoneUser', { offset: utcOffsetLabel(userTz.value, now.value) }),
  },
])
const zoneName = computed(() =>
  t(
    tz.value === circuitTz.value && mode.value === 'circuit'
      ? 'admin.sessions.panel.startCircuit'
      : 'admin.sessions.panel.startUser',
  ),
)

const dirtyFlags = ref({ parrilla: false, resultados: false })
const dirty = computed(() => dirtyFlags.value.parrilla || dirtyFlags.value.resultados)
const guard = useUnsavedChanges(dirty)

const pendingTab = ref<SessionTab | null>(null)
function go(next: string) {
  if (next === tab.value) return
  if (dirty.value) {
    pendingTab.value = next as SessionTab
    return
  }
  push(next as SessionTab)
}
function push(next: SessionTab) {
  dirtyFlags.value = { parrilla: false, resultados: false }
  void router.push({
    path: `/admin/gps/${comp.value}/${seasonId.value}/${route.params.gp}/sesiones/${next}`,
    query: route.query.sesion ? { sesion: route.query.sesion } : {},
  })
}
function selectSession(id: number) {
  void router.replace({ query: { ...route.query, sesion: String(id), nueva: undefined } })
  adding.value = false
}

useAdminCrumbs(() => [
  {
    label: gp.value ? gpShortName(gp.value) : '…',
    to: `/admin/gps/${comp.value}/${seasonId.value}/${route.params.gp}`,
  },
  { label: t('admin.sessions.crumb') },
])

const tabs = SESSION_TABS.map((value) => ({ value, label: t(`admin.sessions.tabs.${value}`) }))
const args = computed(() => ({ comp: comp.value, season: seasonId.value, gp: gp.value?.id ?? 0 }))
const range = computed(() =>
  formatDateRange(
    sessions.value.map((s) => s.date),
    tz.value,
  ),
)
</script>

<template>
  <ErrorState
    v-if="detail.isError.value"
    :what="t('admin.sessions.error')"
    :error="detail.error.value"
    @retry="detail.refetch()"
  />
  <div v-else class="flex flex-col gap-5">
    <AdminHeader
      :title="t('admin.sessions.title')"
      :subtitle="gp ? t('admin.sessions.subtitle', { gp: gp.name, range }) : undefined"
    >
      <SegmentedControl
        v-if="circuitTz"
        v-model="mode"
        :options="zoneOptions"
        :label="t('admin.sessions.zone')"
      />
    </AdminHeader>

    <Skeleton v-if="!gp" variant="card" />
    <EmptyState
      v-else-if="!sessions.length && !adding"
      :title="t('admin.sessions.empty')"
      icon="schedule"
    >
      <PButton :icon="iconFor('add')" @click="adding = true">{{
        t('admin.gpEdit.sessions.add')
      }}</PButton>
    </EmptyState>
    <PTabs
      v-else
      :model-value="tab"
      :tabs="tabs"
      :label="t('admin.sessions.tabsLabel')"
      @update:model-value="go"
    >
      <template #calendario>
        <SessionsCalendar
          v-model:adding="adding"
          :args="args"
          :sessions="sessions"
          :tz="tz"
          :zone-name="zoneName"
          :rulesets="rulesets.data.value ?? []"
          :selected-id="selectedId"
          @select="selectSession"
        />
      </template>
      <template #parrilla>
        <SessionsGrid
          :args="args"
          :sessions="sessions"
          :drivers="drivers.data.value ?? []"
          :selected-id="selectedId"
          @select="selectSession"
          @dirty="dirtyFlags.parrilla = $event"
        />
      </template>
      <template #resultados>
        <SessionsResults
          :args="args"
          :sessions="sessions"
          :drivers="drivers.data.value ?? []"
          :rulesets="rulesets.data.value ?? []"
          :selected-id="selectedId"
          :now="now"
          @select="selectSession"
          @dirty="dirtyFlags.resultados = $event"
        />
      </template>
    </PTabs>

    <ConfirmLeaveDialog :open="guard.open.value" @stay="guard.stay" @leave="guard.leave" />
    <ConfirmLeaveDialog
      :open="pendingTab != null"
      @stay="pendingTab = null"
      @leave="
        () => {
          const n = pendingTab
          pendingTab = null
          if (n) push(n)
        }
      "
    />
  </div>
</template>
