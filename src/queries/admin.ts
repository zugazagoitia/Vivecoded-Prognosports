import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/vue-query'
import { catalogApi, communitiesApi, gpsApi, userApi } from '@/api'
import * as adminApi from '@/api/admin'
import { ApiError } from '@/api/errors'
import type { GrandPrix } from '@/api/schemas'
import { toaster } from '@/composables/useToast'
import { t } from '@/i18n'
import { keys } from './keys'

type Id = string | number

/**
 * Queries and mutations of the administration (épica M). Reads of public data reuse the shared
 * keys; the rest live under the `admin` area. Writes were never run against the real API.
 */
export const adminKeys = {
  users: () => ['admin', 'users'] as const,
  communities: () => ['admin', 'communities'] as const,
  seasonDrivers: (season: Id) => ['admin', 'season-drivers', season] as const,
  seasonConstructors: (season: Id) => ['admin', 'season-constructors', season] as const,
  gpDrivers: (comp: Id, season: Id, gp: Id) => ['admin', 'gp-drivers', comp, season, gp] as const,
  circuits: () => ['admin', 'circuits'] as const,
  circuit: (id: Id) => ['admin', 'circuit', id] as const,
  rulesetDetail: (id: Id) => ['admin', 'ruleset', id] as const,
  rulesetUsageRows: (id: Id) => ['admin', 'ruleset-usage-rows', id] as const,
  notificationTypes: () => ['admin', 'notification-types'] as const,
  timezones: () => ['admin', 'timezones'] as const,
  sessionResults: (comp: Id, season: Id, gp: Id, session: Id) =>
    ['admin', 'results', comp, season, gp, session] as const,
  sessionGrid: (comp: Id, season: Id, gp: Id, session: Id) =>
    ['admin', 'grid', comp, season, gp, session] as const,
}

const has = (v: MaybeRefOrGetter<Id | undefined | null>) => computed(() => toValue(v) != null)

// --- reads ---------------------------------------------------------------------------------

/** `GET /v2/user` (whole list: size is por confirmar, M1/M10). */
export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: ({ signal }) => userApi.listUsers(signal),
  })
}

export function useAdminCommunities() {
  return useQuery({
    queryKey: adminKeys.communities(),
    queryFn: ({ signal }) => communitiesApi.listCommunities(undefined, signal),
  })
}

export function useSeasonDrivers(season: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => adminKeys.seasonDrivers(toValue(season) ?? '')),
    queryFn: ({ signal }) => catalogApi.listSeasonDrivers(toValue(season)!, signal),
    enabled: has(season),
  })
}

export function useSeasonConstructors(season: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => adminKeys.seasonConstructors(toValue(season) ?? '')),
    queryFn: ({ signal }) => catalogApi.listSeasonConstructors(toValue(season)!, signal),
    enabled: has(season),
  })
}

export function useGpDrivers(
  comp: MaybeRefOrGetter<Id | undefined>,
  season: MaybeRefOrGetter<Id | undefined>,
  gp: MaybeRefOrGetter<Id | undefined>,
) {
  return useQuery({
    queryKey: computed(() =>
      adminKeys.gpDrivers(toValue(comp) ?? '', toValue(season) ?? '', toValue(gp) ?? ''),
    ),
    queryFn: ({ signal }) =>
      gpsApi.listGpDrivers(toValue(comp)!, toValue(season)!, toValue(gp)!, signal),
    enabled: computed(
      () => toValue(comp) != null && toValue(season) != null && toValue(gp) != null,
    ),
  })
}

/** Driver count of each GP of a season: one request per GP (cost por confirmar, M2). */
export function useGpDriverCounts(
  comp: MaybeRefOrGetter<Id>,
  season: MaybeRefOrGetter<Id | undefined>,
  gps: MaybeRefOrGetter<readonly GrandPrix[]>,
) {
  const results = useQueries({
    queries: computed(() =>
      toValue(gps).map((g) => ({
        queryKey: adminKeys.gpDrivers(toValue(comp), toValue(season) ?? '', g.id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          gpsApi.listGpDrivers(toValue(comp), toValue(season)!, g.id, signal),
        enabled: toValue(season) != null,
        staleTime: 60_000,
      })),
    ),
  })
  return computed(() => {
    const out: Record<number, number | undefined> = {}
    toValue(gps).forEach((g, i) => {
      out[g.id] = results.value[i]?.data?.length
    })
    return out
  })
}

export function useSessionResults(
  comp: MaybeRefOrGetter<Id | undefined>,
  season: MaybeRefOrGetter<Id | undefined>,
  gp: MaybeRefOrGetter<Id | undefined>,
  session: MaybeRefOrGetter<Id | undefined>,
) {
  return useQuery({
    queryKey: computed(() =>
      adminKeys.sessionResults(
        toValue(comp) ?? '',
        toValue(season) ?? '',
        toValue(gp) ?? '',
        toValue(session) ?? '',
      ),
    ),
    queryFn: ({ signal }) =>
      gpsApi.getResults(toValue(comp)!, toValue(season)!, toValue(gp)!, toValue(session)!, signal),
    enabled: computed(
      () =>
        toValue(comp) != null &&
        toValue(season) != null &&
        toValue(gp) != null &&
        toValue(session) != null,
    ),
  })
}

export function useSessionGrid(
  comp: MaybeRefOrGetter<Id | undefined>,
  season: MaybeRefOrGetter<Id | undefined>,
  gp: MaybeRefOrGetter<Id | undefined>,
  session: MaybeRefOrGetter<Id | undefined>,
) {
  return useQuery({
    queryKey: computed(() =>
      adminKeys.sessionGrid(
        toValue(comp) ?? '',
        toValue(season) ?? '',
        toValue(gp) ?? '',
        toValue(session) ?? '',
      ),
    ),
    queryFn: ({ signal }) =>
      gpsApi.getGrid(toValue(comp)!, toValue(season)!, toValue(gp)!, toValue(session)!, signal),
    enabled: computed(
      () =>
        toValue(comp) != null &&
        toValue(season) != null &&
        toValue(gp) != null &&
        toValue(session) != null,
    ),
  })
}

export function useRulesets() {
  return useQuery({
    queryKey: keys.rulesets(),
    queryFn: ({ signal }) => catalogApi.listRulesets(signal),
  })
}

export function useRulesetUsageRows(id: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => adminKeys.rulesetUsageRows(toValue(id) ?? '')),
    queryFn: ({ signal }) => catalogApi.getRulesetUsages(toValue(id)!, signal),
    enabled: has(id),
    retry: false,
  })
}

export function useAdminCircuits() {
  return useQuery({
    queryKey: adminKeys.circuits(),
    queryFn: ({ signal }) => catalogApi.listCircuits(signal),
  })
}

export function useAdminCircuit(id: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => adminKeys.circuit(toValue(id) ?? '')),
    queryFn: ({ signal }) => catalogApi.getCircuit(toValue(id)!, signal),
    enabled: has(id),
  })
}

export function useNotificationChannels() {
  return useQuery({
    queryKey: ['admin', 'notification-channels'] as const,
    queryFn: ({ signal }) => adminApi.listChannelOptions(signal),
  })
}

export function useTimezoneNames() {
  return useQuery({
    queryKey: adminKeys.timezones(),
    queryFn: ({ signal }) => adminApi.listTimezoneNames(signal),
    staleTime: Infinity,
  })
}

// --- writes --------------------------------------------------------------------------------

/** A 404/405/501 on an endpoint missing from the spec: «aún no disponible» instead of a raw error. */
export function isUnavailable(e: unknown): boolean {
  return e instanceof ApiError && [404, 405, 501].includes(e.status)
}

const refreshGps = (qc: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ['gps'] }),
    qc.invalidateQueries({ queryKey: ['next-gp'] }),
  ])

export function useCreateGp(season: MaybeRefOrGetter<Id | undefined>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.createGpInSeason>[1]) =>
      adminApi.createGpInSeason(toValue(season)!, data),
    onSuccess: async () => {
      await refreshGps(qc)
      toaster.success(t('admin.gpEdit.toast.created'))
    },
  })
}

interface GpArgs {
  comp: Id
  season: Id
  gp: Id
}

export function useUpdateGp(args: MaybeRefOrGetter<GpArgs>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (changes: Parameters<typeof adminApi.updateGpData>[3]) => {
      const a = toValue(args)
      return adminApi.updateGpData(a.comp, a.season, a.gp, changes)
    },
    onSuccess: async () => {
      await refreshGps(qc)
      toaster.success(t('admin.gpEdit.toast.saved'))
    },
  })
}

export function useReplaceGpDrivers(args: MaybeRefOrGetter<GpArgs>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => {
      const a = toValue(args)
      return adminApi.replaceGpDrivers(a.comp, a.season, a.gp, ids)
    },
    onSuccess: async () => {
      const a = toValue(args)
      await qc.invalidateQueries({ queryKey: adminKeys.gpDrivers(a.comp, a.season, a.gp) })
      toaster.success(t('admin.gpDrivers.toast.saved'))
    },
  })
}

export function useUploadGpImage(args: MaybeRefOrGetter<GpArgs>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const a = toValue(args)
      return gpsApi.uploadGpImage(a.comp, a.season, a.gp, file)
    },
    onSuccess: async () => {
      await refreshGps(qc)
      toaster.success(t('admin.gpEdit.image.uploaded'))
    },
  })
}

export function useDeleteGpImage(args: MaybeRefOrGetter<GpArgs>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => {
      const a = toValue(args)
      return gpsApi.deleteGpImage(a.comp, a.season, a.gp)
    },
    onSuccess: async () => {
      await refreshGps(qc)
      toaster.success(t('admin.gpEdit.image.removed'))
    },
  })
}

export function useSaveSession(args: MaybeRefOrGetter<GpArgs>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { session: Id; date: string }) => {
      const a = toValue(args)
      return gpsApi.updateGpSession(a.comp, a.season, a.gp, v.session, { date: v.date })
    },
    onSuccess: async () => {
      await refreshGps(qc)
      toaster.success(t('admin.sessions.toast.saved'))
    },
  })
}

export function useDeleteSession(args: MaybeRefOrGetter<GpArgs>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (session: Id) => {
      const a = toValue(args)
      return gpsApi.deleteGpSession(a.comp, a.season, a.gp, session)
    },
    onSuccess: async () => {
      await refreshGps(qc)
      toaster.success(t('admin.sessions.toast.deleted'))
    },
  })
}

export function usePublishGrid(args: MaybeRefOrGetter<GpArgs>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { session: Id; grid: adminApi.GridRowInput[]; notify: boolean }) => {
      const a = toValue(args)
      await adminApi.publishGrid(a.comp, a.season, a.gp, v.session, v.grid)
      if (v.notify) await adminApi.notifyGrid(a.comp, a.season, a.gp, v.session)
    },
    onSuccess: async () => {
      const a = toValue(args)
      await qc.invalidateQueries({ queryKey: ['admin', 'grid', a.comp, a.season, a.gp] })
      toaster.success(t('admin.sessions.toast.gridPublished'))
    },
  })
}

export function useSaveResults(args: MaybeRefOrGetter<GpArgs>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { session: Id; results: Record<string, number>; fastLap: number | null }) => {
      const a = toValue(args)
      return adminApi.saveSessionResults(a.comp, a.season, a.gp, v.session, v.results, v.fastLap)
    },
    onSuccess: async () => {
      const a = toValue(args)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin', 'results', a.comp, a.season, a.gp] }),
        refreshGps(qc),
      ])
      toaster.success(t('admin.sessions.toast.resultsSaved'))
    },
  })
}

export function useSaveCircuit(id: MaybeRefOrGetter<Id | undefined>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      const cid = toValue(id)
      return cid != null ? catalogApi.updateCircuit(cid, body) : catalogApi.createCircuit(body)
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin', 'circuit'] }),
        qc.invalidateQueries({ queryKey: adminKeys.circuits() }),
        qc.invalidateQueries({ queryKey: ['season-circuits'] }),
        qc.invalidateQueries({ queryKey: ['circuit'] }),
      ])
      toaster.success(t('admin.circuitEdit.toast.saved'))
    },
  })
}

export function useSaveVariant(circuit: MaybeRefOrGetter<Id>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id?: Id; body: Record<string, unknown> }) =>
      v.id != null
        ? catalogApi.updateCircuitVariant(toValue(circuit), v.id, v.body)
        : catalogApi.createCircuitVariant(toValue(circuit), v.body),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: adminKeys.circuit(toValue(circuit)) }),
        qc.invalidateQueries({ queryKey: adminKeys.circuits() }),
      ])
      toaster.success(t('admin.circuitEdit.toast.variantSaved'))
    },
  })
}

export function useCreateRuleset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => catalogApi.createRuleset(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.rulesets() })
      toaster.success(t('admin.rules.toast.created'))
    },
  })
}

export function useDeleteRuleset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => catalogApi.deleteRuleset(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.rulesets() })
      toaster.success(t('admin.rules.toast.deleted'))
    },
  })
}

export function useSendNotification() {
  return useMutation({
    mutationFn: (body: Parameters<typeof adminApi.sendManualNotification>[0]) =>
      adminApi.sendManualNotification(body),
    meta: { silent: true },
  })
}

export function useRecalculate(args: MaybeRefOrGetter<{ comp: Id; season: Id; gp: Id }>) {
  return useMutation({
    mutationFn: (session: Id) => {
      const a = toValue(args)
      return adminApi.recalculateSession(a.comp, a.season, a.gp, session)
    },
    meta: { silent: true },
  })
}

/** Whether each session already has results (one request per session; por confirmar the cost). */
export function useSessionsHaveResults(
  args: MaybeRefOrGetter<{ comp: Id; season: Id; gp: Id } | undefined>,
  sessions: MaybeRefOrGetter<readonly { id: number }[]>,
) {
  const results = useQueries({
    queries: computed(() =>
      toValue(sessions).map((s) => ({
        queryKey: adminKeys.sessionResults(
          toValue(args)?.comp ?? '',
          toValue(args)?.season ?? '',
          toValue(args)?.gp ?? '',
          s.id,
        ),
        queryFn: ({ signal }: { signal: AbortSignal }) => {
          const a = toValue(args)!
          return gpsApi.getResults(a.comp, a.season, a.gp, s.id, signal)
        },
        enabled: toValue(args) != null,
      })),
    ),
  })
  return computed(() => {
    const out: Record<number, boolean | undefined> = {}
    toValue(sessions).forEach((s, i) => {
      const d = results.value[i]?.data
      out[s.id] = d ? d.length > 0 : undefined
    })
    return out
  })
}

/** Independent session catalogue (`GET /v2/sessions`), to add a session to a GP. */
export function useCatalogSessions() {
  return useQuery({
    queryKey: ['admin', 'catalog-sessions'] as const,
    queryFn: ({ signal }) => catalogApi.listSessions(signal),
    staleTime: 5 * 60_000,
  })
}

export function useAddSession(args: MaybeRefOrGetter<{ comp: Id; season: Id; gp: Id }>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { session: number; date: string }) => {
      const a = toValue(args)
      return gpsApi.createGpSession(a.comp, a.season, a.gp, v)
    },
    onSuccess: async () => {
      await refreshGps(qc)
      toaster.success(t('admin.sessions.toast.added'))
    },
  })
}

const refreshRoster = (qc: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ['admin', 'season-drivers'] }),
    qc.invalidateQueries({ queryKey: ['admin', 'season-constructors'] }),
  ])

/**
 * New driver = global driver (`POST /v2/drivers`) + season relation (`POST /v2/seasons/{s}/drivers`
 * with number and colour); edit = `PUT` of the relation (number, colour). The team of a driver
 * has no field in these bodies (por confirmar).
 */
export function useSaveSeasonDriver(season: MaybeRefOrGetter<Id | undefined>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      id?: number
      person?: {
        firstname: string
        lastname: string
        code: string
        nationality?: string
        birth?: string
      }
      number: number
      color: string
    }) => {
      const s = toValue(season)!
      if (v.id != null) {
        return catalogApi.updateSeasonDriver(s, v.id, { number: v.number, color: v.color })
      }
      const id = await adminApi.createDriverAndFind({ ...v.person! })
      return catalogApi.addSeasonDriver(s, { driver: String(id), number: v.number, color: v.color })
    },
    onSuccess: async () => {
      await refreshRoster(qc)
      toaster.success(t('admin.drivers.toast.driverSaved'))
    },
  })
}

/** New team = `POST /v2/constructors` (name) + season relation (car, fullname, colour). */
export function useSaveSeasonConstructor(season: MaybeRefOrGetter<Id | undefined>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      id?: number
      name: string
      car: string
      fullname: string
      teamcolor: string
    }) => {
      const s = toValue(season)!
      const rel = { car: v.car, fullname: v.fullname, teamcolor: v.teamcolor }
      if (v.id != null) return catalogApi.updateSeasonConstructor(s, v.id, rel)
      const id = await adminApi.createConstructorAndFind(v.name)
      return catalogApi.addSeasonConstructor(s, { constructorId: String(id), ...rel })
    },
    onSuccess: async () => {
      await refreshRoster(qc)
      toaster.success(t('admin.drivers.toast.teamSaved'))
    },
  })
}
