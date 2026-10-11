import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { gpsApi } from '@/api'
import type { Driver, Prediction } from '@/api/schemas'
import { toTipps } from '@/lib/predict'
import { useSessionStore } from '@/stores/session'
import { keys } from './keys'
import { useActor, type GpArgs } from './gp'

/**
 * Queries and mutation of the predict screen (G3). The drivers of the GP and the write of the
 * prediction live here, apart from `queries/gp.ts` (G2), whose `useSessionTipps` (the saved
 * prediction), `useSessionGrid`, `useSessionResults` and `useGpRulesets` the screen reuses.
 */

/** Drivers entered in the GP (`GET /v2/gps/{c}/{s}/{gp}/drivers`): the pool and the validation. */
export function useGpDrivers(args: MaybeRefOrGetter<GpArgs | undefined>) {
  const actor = useActor()
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return ['gp-drivers', a?.competition ?? '', a?.season ?? '', a?.gp ?? ''] as const
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return gpsApi.listGpDrivers(a.competition, a.season, a.gp, signal)
    },
    enabled: computed(() => actor.ready.value && toValue(args) != null),
  })
}

export interface SaveTippsVars {
  args: GpArgs
  session: number
  /** Driver id per slot, in order (all N filled). */
  sel: (number | null)[]
  /** Drivers of the GP, to build the optimistic rows. */
  drivers: readonly Driver[]
}

/**
 * Saves the prediction. Optimistic: the saved prediction of the session is replaced right away
 * (rolled back if the API refuses) and, once settled, every `tipps` query of the GP (the
 * session's prediction, the weekend summaries and the points per position) is invalidated.
 */
export function useSaveTipps() {
  const actor = useActor()
  const user = useSessionStore()
  const qc = useQueryClient()

  const tippsKey = (v: SaveTippsVars) =>
    keys.tipps(
      actor.communityId.value ?? '',
      v.args.competition,
      v.args.season,
      v.args.gp,
      v.session,
    )

  return useMutation({
    mutationFn: (v: SaveTippsVars) =>
      gpsApi.submitTipps(
        v.args.competition,
        v.args.season,
        v.args.gp,
        v.session,
        actor.communityId.value!,
        toTipps(v.sel),
      ),
    onMutate: async (v) => {
      const key = tippsKey(v)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Prediction[]>(key)
      const byId = new Map(v.drivers.map((d) => [d.id, d]))
      const rows: Prediction[] = v.sel.flatMap((id, i) => {
        const driver = id == null ? undefined : byId.get(id)
        return driver ? [{ user: user.user ?? undefined, driver, position: i + 1 }] : []
      })
      // Keep the rows of other users (visible only once closed) untouched.
      const others = (previous ?? []).filter(
        (p) => p.user != null && actor.userId.value != null && p.user.id !== actor.userId.value,
      )
      qc.setQueryData(key, [...rows, ...others])
      return { key, previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({
        queryKey: keys.tipps(
          actor.communityId.value ?? '',
          v.args.competition,
          v.args.season,
          v.args.gp,
        ),
      }),
  })
}
