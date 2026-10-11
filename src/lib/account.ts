import { z } from 'zod'
import type { NotificationChannel } from '@/api/notifications'
import type { AuthToken } from '@/api/schemas'
import { t } from '@/i18n'
import type { IconName } from '@/components/ui/icons'

/** Account settings (U3): pure helpers (notification matrix, sessions, forms). */

export const BIO_MAX = 160 // TO CONFIRM with the API
export const PASSWORD_MIN = 8
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png'] as const

export const ACCOUNT_SECTIONS = [
  'datos',
  'foto',
  'correo',
  'sesiones',
  'telegram',
  'avisos',
] as const
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number]

// --- Notifications --------------------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  'INFO',
  'SESSION_PRE_ALERT',
  'SESSION_ALERT',
  'GRID_CHANGES',
  'POINTS_DISPATCHED',
] as const
export type NotificationTypeId = (typeof NOTIFICATION_TYPES)[number]
export const CHANNELS = ['mail', 'telegram'] as const
export type ChannelId = (typeof CHANNELS)[number]
export type PrefMatrix = Record<NotificationTypeId, Record<ChannelId, boolean>>

export const notificationTypeLabel = (type: NotificationTypeId): string =>
  t(`account.notifications.types.${type}.name`)
export const notificationTypeText = (type: NotificationTypeId): string =>
  t(`account.notifications.types.${type}.text`)

export function emptyMatrix(): PrefMatrix {
  return Object.fromEntries(
    NOTIFICATION_TYPES.map((n) => [n, { mail: false, telegram: false }]),
  ) as PrefMatrix
}

function channelOf(key: string): ChannelId | null {
  if (/mail|correo/i.test(key)) return 'mail'
  if (/telegram/i.test(key)) return 'telegram'
  return null
}
const truthy = (v: unknown) => v === true || v === 'true' || v === 1

/**
 * Reads `User.preferences` (spec: free-form map). Accepted shapes per type: `{ mail: true,
 * telegram: false }` or `['MAIL', 'TELEGRAM']` (TO CONFIRM with the backend).
 */
export function readPreferences(prefs: unknown): PrefMatrix {
  const out = emptyMatrix()
  if (!prefs || typeof prefs !== 'object') return out
  const map = prefs as Record<string, unknown>
  for (const type of NOTIFICATION_TYPES) {
    const v = map[type] ?? map[type.toLowerCase()]
    if (Array.isArray(v)) {
      for (const c of v) {
        const ch = typeof c === 'string' ? channelOf(c) : null
        if (ch) out[type][ch] = true
      }
    } else if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        const ch = channelOf(k)
        if (ch && truthy(val)) out[type][ch] = true
      }
    }
  }
  return out
}

/** Copy of the matrix with only that cell flipped. */
export function togglePref(m: PrefMatrix, type: NotificationTypeId, ch: ChannelId): PrefMatrix {
  const next = Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n, { ...m[n] }])) as PrefMatrix
  next[type][ch] = !next[type][ch]
  return next
}

export interface PrefChange {
  type: NotificationTypeId
  channel: ChannelId
  toggleTo: boolean
}
/** Cells that differ, in table order. */
export function diffPreferences(original: PrefMatrix, current: PrefMatrix): PrefChange[] {
  const out: PrefChange[] = []
  for (const type of NOTIFICATION_TYPES)
    for (const channel of CHANNELS)
      if (original[type][channel] !== current[type][channel])
        out.push({ type, channel, toggleTo: current[type][channel] })
  return out
}

export interface ChannelState {
  /** The backend offers the channel. */
  enabled: boolean
  /** Telegram: the account is linked. */
  linked: boolean
}
/** Mail and Telegram state out of `GET /notifications/channels` (missing = mail on, Telegram off). */
export function channelStates(
  list: NotificationChannel[] | undefined,
): Record<ChannelId, ChannelState> {
  const find = (ch: ChannelId) =>
    list?.find((c) => channelOf(`${c.id ?? ''} ${c.label ?? ''}`) === ch)
  const mail = find('mail')
  const tg = find('telegram')
  return {
    mail: { enabled: mail?.enabled ?? true, linked: true },
    telegram: { enabled: tg?.enabled ?? true, linked: tg?.suscribed ?? false },
  }
}

/** Telegram username if the user preferences carry it (TO CONFIRM). */
export function telegramUsername(prefs: unknown): string | undefined {
  if (!prefs || typeof prefs !== 'object') return undefined
  const tg = (prefs as Record<string, unknown>).telegram
  if (tg && typeof tg === 'object') {
    const u = (tg as Record<string, unknown>).username
    if (typeof u === 'string' && u) return u.replace(/^@/, '')
  }
  return undefined
}

// --- Profile --------------------------------------------------------------------------------

export interface ProfileValues {
  bio: string
  location: string
  birthdate: string
  timeZone: string
}

export const bioCounter = (bio: string): string => `${bio.length}/${BIO_MAX}`

export function profileSchema(m: { bioMax: string; birthdate: string; locationMax: string }) {
  return z.object({
    bio: z.string().max(BIO_MAX, { error: m.bioMax }),
    location: z.string().max(100, { error: m.locationMax }),
    birthdate: z.string().refine(
      (v) => {
        if (!v) return true
        const d = new Date(`${v}T00:00:00Z`)
        return !Number.isNaN(d.getTime()) && d.getTime() < Date.now()
      },
      { error: m.birthdate },
    ),
    timeZone: z.string(),
  })
}

/** Only the fields that changed (empty = nothing to PATCH). */
export function diffProfile(
  original: ProfileValues,
  current: ProfileValues,
): Partial<ProfileValues> {
  const out: Partial<ProfileValues> = {}
  for (const k of Object.keys(original) as (keyof ProfileValues)[])
    if (original[k] !== current[k]) out[k] = current[k]
  return out
}

/** `2026-05-14T00:00:00Z` or `1991-05-14` -> `1991-05-14` (for `<input type="date">`). */
export const toDateInput = (v?: string | null): string => (v ? v.slice(0, 10) : '')

export interface TimezoneOption {
  value: string
  label: string
}
/** `{ "Europe/Madrid": "+02:00" }` (or a list of ids) -> options sorted by offset then name. */
export function parseTimezones(raw: unknown): TimezoneOption[] {
  let pairs: [string, string][] = []
  if (Array.isArray(raw)) {
    pairs = raw.filter((x): x is string => typeof x === 'string').map((x) => [x, ''])
  } else if (raw && typeof raw === 'object') {
    pairs = Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? v : ''])
  }
  const minutes = (o: string) => {
    const m = /^([+-])(\d{2}):(\d{2})$/.exec(o)
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  }
  return pairs
    .sort((a, b) => minutes(a[1]) - minutes(b[1]) || a[0].localeCompare(b[0]))
    .map(([id, offset]) => ({
      value: id,
      label: `${id.replaceAll('_', ' ')}${offset ? ` (UTC${offset})` : ''}`,
    }))
}

// --- Photo / password -----------------------------------------------------------------------

export type AvatarProblem = 'type' | 'size'
export function avatarFileGuard(file: { type: string; size: number }): AvatarProblem | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size > AVATAR_MAX_BYTES) return 'size'
  return null
}

export function passwordSchema(m: { current: string; min: string; mismatch: string }) {
  return z
    .object({
      current: z.string().min(1, { error: m.current }),
      next: z.string().min(PASSWORD_MIN, { error: m.min }),
      repeat: z.string(),
    })
    .refine((v) => v.next === v.repeat, { error: m.mismatch, path: ['repeat'] })
}

export function emailChangeSchema(m: { required: string; invalid: string; password: string }) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, { error: m.required })
      .pipe(z.email({ error: m.invalid })),
    password: z.string().min(1, { error: m.password }),
  })
}

// --- Sessions -------------------------------------------------------------------------------

export interface AgentInfo {
  icon: IconName
  label: string
}

/** Device icon and «Chrome en macOS» label out of a user-agent string. */
export function parseAgent(agent?: string | null): AgentInfo {
  const ua = agent ?? ''
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\/|FxiOS/.test(ua)
        ? 'Firefox'
        : /Chrome\/|CriOS/.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : null
  let os: string | null = null
  let icon: IconName = 'desktop'
  if (/iPhone/.test(ua)) {
    os = 'iPhone'
    icon = 'mobile-screen'
  } else if (/iPad/.test(ua)) {
    os = 'iPad'
    icon = 'tablet-screen-button'
  } else if (/Android/.test(ua)) {
    os = 'Android'
    icon = /Mobile/.test(ua) ? 'mobile-screen' : 'tablet-screen-button'
  } else if (/Windows/.test(ua)) os = 'Windows'
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS'
  else if (/CrOS/.test(ua)) os = 'ChromeOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  if (!browser && !os) return { icon, label: t('account.sessions.unknown') }
  if (!browser) return { icon, label: os! }
  if (!os) return { icon, label: browser }
  return { icon, label: t('account.sessions.agent', { browser, os }) }
}

/** The current session first, the rest by last activity (newest first). */
export function sortTokens(tokens: AuthToken[]): AuthToken[] {
  const time = (x: AuthToken) => (x.lastActivityAt ? Date.parse(x.lastActivityAt) || 0 : 0)
  return [...tokens].sort((a, b) => Number(b.current) - Number(a.current) || time(b) - time(a))
}
