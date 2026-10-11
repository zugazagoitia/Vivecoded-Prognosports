import { z } from 'zod'
import type { Circuit } from '@/api/schemas'
import { utcOffsetLabel } from '@/lib/gp'

/** Pure logic of the circuits catalogue (M6 list, M7 form) shared with the GP form (M3). */

const km = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
/** «4,940 km» (`CircuitVariant.distance` is in km, see `src/api/README.md`). */
export const formatKm = (distance: number): string => `${km.format(distance)} km`

export const variantCount = (c: Pick<Circuit, 'variants'>): number => c.variants?.length ?? 0

/**
 * Length shown in the list. With several variants the first one is used (the mock-up shows a
 * single figure; «mín.–máx.» is por confirmar). «—» without variants or distance.
 */
export function circuitLength(c: Pick<Circuit, 'variants'>): string {
  const d = c.variants?.find((v) => v.distance != null)?.distance
  return d != null ? formatKm(d) : '—'
}

/** Alphabetical (Spanish) by name. */
export function sortCircuits<T extends Pick<Circuit, 'name'>>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'))
}

export interface CircuitRow {
  id: number
  name: string
  country: string
  variants: number
  length: string
}
export function circuitRow(c: Circuit): CircuitRow {
  return {
    id: c.id,
    name: c.name ?? '',
    country: c.country ?? '',
    variants: variantCount(c),
    length: circuitLength(c),
  }
}

/** «Asia/Singapore (UTC+8)». */
export function formatTimezone(tz: string, at: number | Date = Date.now()): string {
  return `${tz} (${utcOffsetLabel(tz, at)})`
}

export const optionalNumber = (label: string) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number(label).optional())

/** Circuit form. Messages are i18n keys. */
export const circuitSchema = z.object({
  name: z.string().trim().min(1, 'admin.circuitEdit.errors.name'),
  country: z.string().trim().min(1, 'admin.circuitEdit.errors.country'),
  locality: z.string().trim().optional(),
  latitude: optionalNumber('admin.circuitEdit.errors.coordinate'),
  longitude: optionalNumber('admin.circuitEdit.errors.coordinate'),
})
export type CircuitForm = z.input<typeof circuitSchema>

/** Variant form. */
export const variantSchema = z.object({
  name: z.string().trim().min(1, 'admin.circuitEdit.errors.variantName'),
  distance: z.coerce
    .number('admin.circuitEdit.errors.distance')
    .positive('admin.circuitEdit.errors.distance'),
  turns: z.coerce
    .number('admin.circuitEdit.errors.turns')
    .int('admin.circuitEdit.errors.turns')
    .min(0, 'admin.circuitEdit.errors.turns'),
})
export type VariantForm = z.input<typeof variantSchema>

/** Comma decimal accepted: «4,94» -> 4.94. */
export const parseDecimal = (raw: string): string => raw.trim().replace(',', '.')
