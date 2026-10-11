import type { GrandPrix } from '@/api/schemas'
import { gpDate } from '@/lib/gps'

/** Pure logic of manual notifications (M12) and the points recalculation (M13). */

export type NotificationKind =
  'INFO' | 'GRID_CHANGES' | 'SESSION_PRE_ALERT' | 'SESSION_ALERT' | 'POINTS_DISPATCHED'

/** i18n key under `admin.notifications.types` of each notification type. */
export const TYPE_KEY: Record<NotificationKind, string> = {
  INFO: 'info',
  GRID_CHANGES: 'gridChanges',
  SESSION_PRE_ALERT: 'sessionPreAlert',
  SESSION_ALERT: 'sessionAlert',
  POINTS_DISPATCHED: 'pointsDispatched',
}

/** Types an admin can send by hand; the other three go out on their own. */
export const MANUAL_TYPES: readonly NotificationKind[] = ['INFO', 'GRID_CHANGES']
export const AUTOMATIC_TYPES: readonly NotificationKind[] = [
  'SESSION_PRE_ALERT',
  'SESSION_ALERT',
  'GRID_CHANGES',
  'POINTS_DISPATCHED',
]

export function canSend(f: { t: string; m: string; canales: readonly string[] }): boolean {
  return f.t.trim() !== '' && f.m.trim() !== '' && f.canales.length > 0
}

/** Only mail and Telegram exist (14.2): any other channel the API lists is ignored. */
export const SUPPORTED_CHANNELS: readonly string[] = ['mail', 'email', 'telegram']
export const isSupportedChannel = (id: string | undefined): boolean =>
  !!id && SUPPORTED_CHANNELS.includes(id.toLowerCase())

// --- M13 ------------------------------------------------------------------------------------

/** GPs that can be recalculated: with calculated points or already disputed, newest round first. */
export function recalcGps(gps: readonly GrandPrix[], now: number): GrandPrix[] {
  return gps
    .filter((g) => {
      if (g.suspended) return false
      const d = gpDate(g)
      return g.hasPointsInGrandPrix === true || (d != null && d < now)
    })
    .sort((a, b) => (b.round ?? 0) - (a.round ?? 0))
}

export type StampKind = { kind: 'today' | 'yesterday'; time: string } | { kind: 'days'; n: number }

/** Relative date of a calculation: «hoy · 10:12», «ayer · 18:40» or «hace 6 días». */
export function relativeStamp(now: number, at: number, tz?: string): StampKind {
  const day = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(ms) // YYYY-MM-DD
  const diff = Math.round((Date.parse(day(now)) - Date.parse(day(at))) / 86_400_000)
  const time = new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)
  if (diff <= 0) return { kind: 'today', time }
  if (diff === 1) return { kind: 'yesterday', time }
  return { kind: 'days', n: diff }
}

export type CalcStatus = 'running' | 'done' | 'error'
export interface CalcRecord {
  id: number
  at: number
  gp: string
  /** Session name, or null for «todas». */
  session: string | null
  status: CalcStatus
}

/** «Azerbaiyán · carrera» / «Azerbaiyán · todas». */
export const scopeLabel = (gp: string, session: string | null, all = 'todas'): string =>
  `${gp} · ${(session ?? all).toLocaleLowerCase('es')}`
