import { t } from '@/i18n'
import { ApiError, genericMessage } from './errors'

/**
 * User-facing Spanish text for any error. The API's own `message` wins when it
 * provides one; otherwise we map by status. Never blames the user.
 */
export function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return t('errors.unknown')
  if (error.kind === 'network') return t('errors.network')
  if (error.kind === 'timeout') return t('errors.timeout')
  if (error.kind === 'validation') return error.message
  if (error.kind === 'contract') return t('errors.unknown')
  const { status, message } = error
  const fromApi = message && message !== genericMessage(status) ? message : undefined
  if (fromApi) return fromApi
  if (status === 401) return t('errors.unauthorized')
  if (status === 403) return t('errors.forbidden')
  if (status === 404) return t('errors.notFound')
  if (status === 409 || status === 422) return message || t('errors.unknown')
  if (status >= 500) return t('errors.server')
  return message || t('errors.unknown')
}
