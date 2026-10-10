import { request } from './client'

export const listNotificationChannels = (signal?: AbortSignal) => request('/v2/notifications/channels', { signal })
export const listNotificationTypes = (signal?: AbortSignal) => request('/v2/notifications/types', { signal })
export const updateNotificationPreferences = (body: unknown, signal?: AbortSignal) =>
  request('/v2/notifications/preferences', { method: 'PATCH', body, signal })
export const listTimezones = (signal?: AbortSignal) => request('/v2/timezones', { anonymous: true, signal })
