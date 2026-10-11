<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import { ADMIN_ITEMS } from '@/components/layout/adminNav'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import Kpi from '@/components/ui/Kpi.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import { iconFor } from '@/components/ui/icons'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useNow } from '@/composables/useNow'
import { ApiError } from '@/api/errors'
import {
  adminGpPath,
  closedCommunities,
  closesIn,
  focusSession,
  gpAdminState,
  newThisWeek,
  panelTasks,
  playedGps,
  prepChecks,
  type CheckId,
} from '@/lib/adminGp'
import { diffSlots, buildSlots } from '@/lib/adminDrivers'
import { gpShortName, sessionLabel } from '@/lib/gp'
import {
  useAdminCommunities,
  useAdminUsers,
  useGpDrivers,
  useSeasonConstructors,
  useSessionGrid,
  useSessionResults,
} from '@/queries/admin'
import { DEFAULT_COMPETITION, useCurrentSeason, useSeasonGps } from '@/queries/circuits'
import { useNextGp } from '@/queries/gps'

/**
 * M1 · Panel de administración (`/admin`): KPI, preparación del próximo GP (6 comprobaciones con
 * enlace a la pantalla que las resuelve), próximas tareas y último cálculo. Below 640px it is the
 * section index of AdminMovil. Rules marked «por confirmar» in the spec are noted in `lib/adminGp`.
 */
definePage({ meta: { title: 'route.admin' } })

const { t } = useI18n()
const phone = useMediaQuery('(max-width: 639px)')
const now = useNow(60_000)
const comp = DEFAULT_COMPETITION

const seasonQ = useCurrentSeason(comp)
const seasonId = computed(() => seasonQ.data.value?.id)
const users = useAdminUsers()
const communities = useAdminCommunities()
const gps = useSeasonGps(comp, seasonId)
const next = useNextGp(comp)
const constructors = useSeasonConstructors(seasonId)

const gp = computed(() => next.data.value)
const noNext = computed(
  () => next.error.value instanceof ApiError && next.error.value.status === 404,
)
const gpSeason = computed(() => gp.value?.season?.id ?? seasonId.value)
const gpComp = computed(() => gp.value?.competition?.id ?? comp)
const prevId = computed(() => gp.value?.previousGrandPrix?.id)
const drivers = useGpDrivers(gpComp, gpSeason, () => gp.value?.id)
const prevDrivers = useGpDrivers(gpComp, gpSeason, prevId)
const session = computed(() => (gp.value ? focusSession(gp.value, now.value) : undefined))
const grid = useSessionGrid(
  gpComp,
  gpSeason,
  () => gp.value?.id,
  () => session.value?.id,
)
const results = useSessionResults(
  gpComp,
  gpSeason,
  () => gp.value?.id,
  () => session.value?.id,
)

const prevName = computed(() => {
  const p = gps.data.value?.find((g) => g.id === prevId.value)
  return p ? gpShortName(p) : ''
})
const driversChanges = computed(() => {
  if (!constructors.data.value || !drivers.data.value || !prevDrivers.data.value) return undefined
  const teams = constructors.data.value
  return diffSlots(buildSlots(teams, prevDrivers.data.value), buildSlots(teams, drivers.data.value))
    .length
})
const expected = computed(() =>
  constructors.data.value ? constructors.data.value.length * 2 : undefined,
)

const checksReady = computed(
  () =>
    !!gp.value &&
    !!constructors.data.value &&
    !drivers.isLoading.value &&
    !grid.isLoading.value &&
    !results.isLoading.value,
)
const input = computed(() =>
  gp.value
    ? {
        gp: gp.value,
        driverCount: drivers.data.value?.length,
        expectedDrivers: expected.value,
        previousName: prevName.value || undefined,
        sameAsPrevious: driversChanges.value === 0,
        changesVsPrevious: driversChanges.value,
        grid: grid.data.value,
        results: results.data.value,
        session: session.value,
        now: now.value,
      }
    : undefined,
)
const checks = computed(() => (input.value ? prepChecks(input.value) : []))
const tasks = computed(() => (input.value ? panelTasks(checks.value, input.value) : []))

const gpPath = computed(() =>
  gp.value ? adminGpPath(gp.value, { competition: gpComp.value, season: gpSeason.value }) : '',
)
const checkTo = (target: string) => `${gpPath.value}${target}`

const sessionName = (s: { code?: string | null; name?: string | null } | undefined) =>
  s ? sessionLabel(s).withArticle : ''
const sessionShort = (s: { code?: string | null; name?: string | null } | undefined) =>
  s ? sessionLabel(s).long.toLocaleLowerCase('es') : ''

function checkTitle(id: CheckId, c: (typeof checks.value)[number]): string {
  const p = c.params
  switch (id) {
    case 'sessions':
      return t('admin.panel.prep.checks.sessions.title', { n: p.n }, Number(p.n))
    case 'drivers':
      return t('admin.panel.prep.checks.drivers.title', p)
    case 'grid':
      return session.value
        ? t('admin.panel.prep.checks.grid.title', { session: sessionShort(session.value) })
        : t('admin.panel.prep.checks.grid.titleNone')
    case 'result':
      return session.value
        ? t('admin.panel.prep.checks.result.title', { session: sessionShort(session.value) })
        : t('admin.panel.prep.checks.result.titleNone')
    default:
      return t(`admin.panel.prep.checks.${id}.title`)
  }
}
function checkDetail(id: CheckId, c: (typeof checks.value)[number]): string {
  const key = `admin.panel.prep.checks.${id}.detail.${c.detail}`
  if (id === 'grid' && c.detail === 'ok') return t(key, { n: c.params.n }, Number(c.params.n))
  if (id === 'drivers' && c.detail === 'changes') return t(key, c.params, Number(c.params.k))
  return t(key, c.params)
}

// KPI
const year = computed(() => seasonQ.data.value?.name ?? '')
const played = computed(() => (gps.data.value ? playedGps(gps.data.value, now.value) : undefined))
const nextClose = computed(() => {
  const s = session.value
  return s ? closesIn(s.date, now.value) : null
})
const phaseState = computed(() =>
  gp.value ? t(`admin.gps.state.${gpAdminState(gp.value, now.value)}`).toLocaleLowerCase('es') : '',
)

const taskIcon = { result: 'edit_note', grid: 'grid_view', prepare: 'flag' } as const
const taskIconName = (k: keyof typeof taskIcon) => iconFor(k === 'grid' ? 'apps' : taskIcon[k])
const taskTone = {
  result: 'bg-warn-tint text-warn-fg',
  grid: 'bg-info-tint text-info-fg',
  prepare: 'bg-tint text-tint-fg',
} as const

function taskTitle(k: (typeof tasks.value)[number]): string {
  if (k.kind === 'prepare')
    return t('admin.panel.tasks.prepare.title', { gp: gp.value ? gpShortName(gp.value) : '' })
  return t(`admin.panel.tasks.${k.kind}.title`, { session: sessionName(k.session) })
}
function taskDetail(k: (typeof tasks.value)[number]): string {
  if (k.kind === 'prepare') {
    const list = (k.missing ?? []).map((m) => t(`admin.panel.tasks.missing.${m}`)).join(', ')
    return t('admin.panel.tasks.prepare.detail', { list })
  }
  return t(`admin.panel.tasks.${k.kind}.detail`)
}

const sections = ADMIN_ITEMS.filter((i) => i.id !== 'panel')
const sectionOrder = [
  'gps',
  'circuitos',
  'pilotos',
  'reglas',
  'usuarios',
  'comunidades',
  'notificaciones',
  'calculos',
]
const mobileSections = sectionOrder
  .map((id) => sections.find((s) => s.id === id))
  .filter((s): s is NonNullable<typeof s> => !!s)

const rowClass =
  'group flex min-h-11 items-center gap-2.5 border-b border-border py-2.5 text-sm no-underline last:border-b-0 hover:no-underline hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'
</script>

<template>
  <!-- AdminMovil: index of sections and quick tasks -->
  <div v-if="phone" class="flex flex-col gap-4">
    <p
      class="bg-info-tint text-info-fg flex items-start gap-3 rounded-sm px-4 py-3 text-sm"
      role="note"
    >
      <PIcon :name="iconFor('desktop_windows')" />
      {{ t('admin.panel.mobileNotice') }}
    </p>
    <div class="grid grid-cols-2 gap-2">
      <PCard :padded="false">
        <Kpi
          :label="t('admin.panel.kpi.users')"
          :value="users.data.value ? users.data.value.length : t('admin.panel.kpi.unknown')"
        />
      </PCard>
      <PCard :padded="false">
        <Kpi
          :label="t('admin.panel.kpi.communities')"
          :value="
            communities.data.value ? communities.data.value.length : t('admin.panel.kpi.unknown')
          "
        />
      </PCard>
    </div>
    <PCard :padded="false">
      <h2 class="t-header text-heading px-4 pt-4 pb-1">{{ t('admin.panel.tasks.mobileTitle') }}</h2>
      <ul class="m-0 list-none p-0">
        <li v-if="gp">
          <RouterLink :to="checkTo('/sesiones/resultados')" :class="[rowClass, 'px-4']">
            <span class="flex min-w-0 flex-1 flex-col">
              <b class="text-heading">{{
                t('admin.panel.tasks.mobileResult', {
                  session: sessionName(session) || t('admin.panel.prep.checks.result.titleNone'),
                })
              }}</b>
              <span class="text-muted text-xs">{{
                t('admin.panel.tasks.mobileResultDetail')
              }}</span>
            </span>
            <PIcon :name="iconFor('chevron_right')" :size="16" class="text-muted" />
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/admin/calculos" :class="[rowClass, 'px-4']">
            <span class="flex min-w-0 flex-1 flex-col">
              <b class="text-heading">{{ t('admin.panel.tasks.recalc') }}</b>
              <span v-if="gp" class="text-muted text-xs">{{ gpShortName(gp) }}</span>
            </span>
            <PIcon :name="iconFor('chevron_right')" :size="16" class="text-muted" />
          </RouterLink>
        </li>
      </ul>
    </PCard>
    <PCard :padded="false">
      <h2 class="t-header text-heading px-4 pt-4 pb-1">{{ t('admin.panel.sections.title') }}</h2>
      <ul class="m-0 list-none p-0">
        <li v-for="s in mobileSections" :key="s.id">
          <RouterLink :to="s.to" :class="[rowClass, 'min-h-[52px] px-4']">
            <PIcon :name="s.icon" class="text-muted" />
            <span class="text-heading flex-1">{{ t(`admin.panel.sections.${s.id}`) }}</span>
            <PIcon :name="iconFor('chevron_right')" :size="16" class="text-muted" />
          </RouterLink>
        </li>
      </ul>
    </PCard>
  </div>

  <div v-else class="flex flex-col gap-6">
    <AdminHeader
      :title="t('admin.panel.title')"
      :subtitle="year ? t('admin.panel.subtitle', { year }) : undefined"
    />

    <div class="grid4 gap-4">
      <PCard :padded="false">
        <Kpi
          :label="t('admin.panel.kpi.users')"
          :value="users.data.value ? users.data.value.length : t('admin.panel.kpi.unknown')"
          :delta="
            users.data.value
              ? t('admin.panel.kpi.usersDelta', { n: newThisWeek(users.data.value, now) })
              : undefined
          "
        />
      </PCard>
      <PCard :padded="false">
        <Kpi
          :label="t('admin.panel.kpi.communities')"
          :value="
            communities.data.value ? communities.data.value.length : t('admin.panel.kpi.unknown')
          "
          :delta="
            communities.data.value
              ? t('admin.panel.kpi.communitiesDelta', {
                  n: closedCommunities(communities.data.value),
                })
              : undefined
          "
        />
      </PCard>
      <PCard :padded="false">
        <Kpi
          :label="t('admin.panel.kpi.gps')"
          :value="
            played != null && seasonQ.data.value?.totalEvents != null
              ? `${played} / ${seasonQ.data.value.totalEvents}`
              : t('admin.panel.kpi.unknown')
          "
          :delta="year ? t('admin.panel.kpi.gpsDelta', { year }) : undefined"
        />
      </PCard>
      <PCard :padded="false">
        <!-- No global endpoint counts predictions across communities: the value stays «—» (por confirmar). -->
        <Kpi
          :label="
            session
              ? t('admin.panel.kpi.predictions', { session: sessionShort(session) })
              : t('admin.panel.kpi.predictionsNext')
          "
          :value="t('admin.panel.kpi.unknown')"
          :delta="
            session
              ? nextClose
                ? t('admin.panel.kpi.closesIn', nextClose)
                : t('admin.panel.kpi.closed')
              : undefined
          "
        />
      </PCard>
    </div>

    <div class="split">
      <PCard>
        <ErrorState
          v-if="next.isError.value && !noNext"
          :what="t('admin.panel.prep.error')"
          :error="next.error.value"
          @retry="next.refetch()"
        />
        <EmptyState
          v-else-if="noNext"
          :title="t('admin.panel.prep.empty')"
          :text="t('admin.panel.prep.emptyText')"
          icon="flag"
        />
        <Skeleton v-else-if="!gp || !checksReady" variant="table" :rows="6" />
        <template v-else>
          <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-col">
              <h2 class="t-header text-heading">
                {{ t('admin.panel.prep.title', { name: gpShortName(gp) }) }}
              </h2>
              <p class="text-muted text-sm">
                {{
                  gp.round != null
                    ? t('admin.panel.prep.sub', { round: gp.round, state: phaseState })
                    : t('admin.panel.prep.subNoRound', { state: phaseState })
                }}
              </p>
            </div>
            <PButton size="sm" :to="gpPath">{{ t('admin.panel.prep.open') }}</PButton>
          </div>
          <ul class="m-0 list-none p-0">
            <li v-for="c in checks" :key="c.id">
              <RouterLink :to="checkTo(c.target)" :class="rowClass">
                <PIcon
                  :name="iconFor(c.state === 'ok' ? 'check_circle' : 'schedule')"
                  :class="c.state === 'ok' ? 'text-ok' : 'text-warn'"
                />
                <span class="sr-only"
                  >{{ t(`admin.panel.prep.${c.state === 'ok' ? 'complete' : 'pending'}`) }}:</span
                >
                <span class="flex min-w-0 flex-1 flex-col">
                  <b class="text-heading text-sm">{{ checkTitle(c.id, c) }}</b>
                  <span class="text-muted text-xs">{{ checkDetail(c.id, c) }}</span>
                </span>
                <PIcon :name="iconFor('chevron_right')" :size="16" class="text-muted" />
              </RouterLink>
            </li>
          </ul>
        </template>
      </PCard>

      <aside class="flex flex-col gap-4">
        <PCard>
          <h2 class="t-header text-heading mb-2">{{ t('admin.panel.tasks.title') }}</h2>
          <Skeleton v-if="next.isLoading.value || (gp && !checksReady)" variant="line" :lines="3" />
          <p v-else-if="!tasks.length" class="text-muted text-sm">
            {{ t('admin.panel.tasks.empty') }}
          </p>
          <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
            <li v-for="k in tasks" :key="k.kind" class="flex items-center gap-3">
              <span
                :class="[
                  taskTone[k.kind],
                  'flex size-10 flex-none items-center justify-center rounded-full',
                ]"
              >
                <PIcon :name="taskIconName(k.kind)" />
              </span>
              <RouterLink
                :to="checkTo(k.target)"
                class="flex min-w-0 flex-col no-underline hover:no-underline"
              >
                <b class="text-heading text-sm">{{ taskTitle(k) }}</b>
                <span class="text-muted text-xs">{{ taskDetail(k) }}</span>
              </RouterLink>
            </li>
          </ul>
        </PCard>
        <PCard>
          <h2 class="t-header text-heading mb-2">{{ t('admin.panel.last.title') }}</h2>
          <!-- There is no calculation log in the API (por confirmar): only the link. -->
          <RouterLink to="/admin/calculos" class="text-link text-sm font-semibold">{{
            t('admin.panel.last.link')
          }}</RouterLink>
        </PCard>
      </aside>
    </div>
  </div>
</template>
