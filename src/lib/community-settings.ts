import { z } from 'zod'
import { t } from '@/i18n'

/**
 * Pure logic of the community settings page (H6): texts of the read-only blocks, the usages
 * count of a rule set, the image validation and the square crop geometry.
 */

export const SETTINGS_SECTIONS = ['imagen', 'invitacion', 'datos', 'reglas', 'miembros'] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

/** How long the button says «Copiado» before going back to «Copiar». */
export const COPIED_MS = 3000
/** Largest accepted source file; the cropped result is always far below the 2 MB API limit. */
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024
/** Side in px of the uploaded (cropped) square image. */
export const CROP_OUTPUT = 512

/** «Cerrada · con invitación» / «Abierta · cualquiera puede unirse». */
export function accessText(open: boolean | null | undefined): string {
  return t(open ? 'communitySettings.data.accessOpen' : 'communitySettings.data.accessClosed')
}

/** «Conjunto «Clásica 2026», público y usado por 4 comunidades.» */
export function usagesText(name: string, isPublic: boolean, count: number | undefined): string {
  const kind = t(isPublic ? 'communitySettings.rules.public' : 'communitySettings.rules.private')
  return count == null
    ? t('communitySettings.rules.footnoteBare', { name, kind })
    : t('communitySettings.rules.footnote', { name, kind, count }, count)
}

/**
 * `GET /v2/rulesets/{id}/usages` is documented without a body schema. Accepts a number, a list
 * (one item per community), `{ count | total | usages }` and numeric strings; undefined otherwise.
 */
export function parseUsages(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw)
  if (Array.isArray(raw)) return raw.length
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    for (const key of ['count', 'total', 'usages', 'communities']) {
      const n = parseUsages(r[key])
      if (n != null) return n
    }
  }
  return undefined
}

/** Whether a user may open the settings: owner or any delegated `can_*` (see `permissionsOf`). */
export const canAccessSettings = (perms: { settings: boolean }) => perms.settings

/** Zod schema of the chosen image file (VeeValidate field `file`). Messages are i18n keys. */
export const imageFileSchema = z.object({
  file: z
    .instanceof(File, { message: 'communitySettings.image.errors.none' })
    .refine((f) => f.type.startsWith('image/'), 'communitySettings.image.errors.type')
    .refine((f) => f.size <= MAX_SOURCE_BYTES, 'communitySettings.image.errors.size'),
})

export interface CropRect {
  sx: number
  sy: number
  sw: number
}

/**
 * Square crop of a `w` x `h` image. `zoom` >= 1 shrinks the square (1 = the largest square);
 * `x`/`y` in [-1, 1] move it inside the free space (0 = centred).
 */
export function cropRect(w: number, h: number, zoom: number, x: number, y: number): CropRect {
  const side = Math.min(w, h) / Math.max(1, zoom)
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  return {
    sw: side,
    sx: (w - side) / 2 + (clamp(x) * (w - side)) / 2,
    sy: (h - side) / 2 + (clamp(y) * (h - side)) / 2,
  }
}

/** Sections of the settings a user sees: image (creator), invitation (`can_recreate_invitation`); the rest are read-only for anyone with access. */
export function visibleSections(perms: {
  editImage: boolean
  recreateInvitation: boolean
}): SettingsSection[] {
  return SETTINGS_SECTIONS.filter(
    (s) => (s !== 'imagen' || perms.editImage) && (s !== 'invitacion' || perms.recreateInvitation),
  )
}
