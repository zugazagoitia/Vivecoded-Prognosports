import { t } from '@/i18n'

export const CLOSE_MARGIN_MS = 5 * 60_000

/** Zona por defecto para visitantes sin sesión. */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

type DateInput = Date | string | number | null | undefined

function toDate(d: DateInput): Date | null {
  if (d === null || d === undefined || d === '') return null
  const date = d instanceof Date ? d : new Date(d)
  return Number.isNaN(date.getTime()) ? null : date
}

function parts(date: Date, tz: string, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of new Intl.DateTimeFormat('es-ES', { timeZone: tz, ...opts }).formatToParts(date)) {
    out[p.type] = p.value.replace('.', '')
  }
  return out
}

/** «vie 10 oct · 12:25» */
export function formatDateTime(d: DateInput, tz: string = browserTimeZone()): string {
  const date = toDate(d)
  if (!date) return t('noDate')
  const p = parts(date, tz, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return `${p.weekday} ${p.day} ${p.month} · ${p.hour}:${p.minute}`
}

/** «10 oct 2026» */
export function formatDate(d: DateInput, tz: string = browserTimeZone()): string {
  const date = toDate(d)
  if (!date) return t('noDate')
  const p = parts(date, tz, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${p.day} ${p.month} ${p.year}`
}

/** «12:25» */
export function formatTime(d: DateInput, tz: string = browserTimeZone()): string {
  const date = toDate(d)
  if (!date) return t('noDate')
  const p = parts(date, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${p.hour}:${p.minute}`
}

/** «en 2 h», «hace 5 min», «Pronto» (menos de 1 min por delante). */
export function formatRelative(d: DateInput, now: Date | number = Date.now()): string {
  const date = toDate(d)
  if (!date) return t('noDate')
  const diff = date.getTime() - (typeof now === 'number' ? now : now.getTime())
  const abs = Math.abs(diff)
  if (abs < 60_000) {
    return diff >= 0 ? t('soon') : t('relative.ago', { value: t('relative.minutes', { n: 0 }) })
  }
  const mins = Math.floor(abs / 60_000)
  let value: string
  if (mins < 60) value = t('relative.minutes', { n: mins })
  else if (mins < 1440) value = t('relative.hours', { n: Math.floor(mins / 60) })
  else value = t('relative.days', { n: Math.floor(mins / 1440) })
  return t(diff > 0 ? 'relative.in' : 'relative.ago', { value })
}

/** «01:32:10», o «1 d 02:57» si pasa de un día. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const two = (n: number) => String(n).padStart(2, '0')
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d >= 1) return `${d} d ${two(h)}:${two(m)}`
  return `${two(h)}:${two(m)}:${two(s % 60)}`
}

export interface HasDate {
  date?: string | Date | null
}

/** Cierre de pronóstico = fecha de sesión − 5 min (§7.5). null si no hay fecha. */
export function closesAt(session: HasDate): Date | null {
  const date = toDate(session.date)
  return date ? new Date(date.getTime() - CLOSE_MARGIN_MS) : null
}

/** Cerrado desde el instante exacto de cierre. Sin fecha: no cerrado. */
export function isClosed(session: HasDate, now: Date | number = Date.now()): boolean {
  const c = closesAt(session)
  if (!c) return false
  return (typeof now === 'number' ? now : now.getTime()) >= c.getTime()
}
