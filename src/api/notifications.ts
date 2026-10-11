import { z } from 'zod'
import { request, requestParsed } from './client'

/** `NotificationChannel` (spec): `suscribed` (sic) = the user receives through it. */
export const NotificationChannelSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  enabled: z.boolean().optional(),
  suscribed: z.boolean().optional(),
})
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>

export const listNotificationChannels = (signal?: AbortSignal) =>
  requestParsed('/v2/notifications/channels', z.array(NotificationChannelSchema), { signal })
export const listNotificationTypes = (signal?: AbortSignal) =>
  request('/v2/notifications/types', { signal })
export const updateNotificationPreferences = (body: unknown, signal?: AbortSignal) =>
  request('/v2/notifications/preferences', { method: 'PATCH', body, signal })

/**
 * Switches one cell of the type x channel matrix. The spec only documents
 * `{ notification, toggleTo }`; `channel` is sent too (TO CONFIRM with the backend).
 */
export const setNotificationPreference = (
  b: { notification: string; channel: string; toggleTo: boolean },
  signal?: AbortSignal,
) => updateNotificationPreferences(b, signal)

/** Public. The real API answers a map `{ "Europe/Madrid": "+02:00", ... }` (spec: `Pair[]`). */
export const listTimezones = (signal?: AbortSignal) =>
  request('/v2/timezones', { anonymous: true, signal })
