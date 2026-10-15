import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { authApi, notificationsApi, userApi, type AuthToken } from '@/api'
import { toaster } from '@/composables/useToast'
import { t } from '@/i18n'
import {
  parseTimezones,
  sortTokens,
  toProfilePatch,
  type PrefChange,
  type ProfileValues,
} from '@/lib/account'
import { useSessionStore } from '@/stores/session'
import { keys } from './keys'

/**
 * Queries and mutations of «Ajustes de la cuenta» (U3). The user itself (profile, preferences)
 * lives in the session store (`GET /user/me`); mutations refresh it. Mutations whose error is
 * shown next to a field use `meta: { silent: true }` (otherwise the global error toast applies).
 */

export function useTimezones() {
  return useQuery({
    queryKey: keys.timezones(),
    queryFn: async ({ signal }) => parseTimezones(await notificationsApi.listTimezones(signal)),
    staleTime: 60 * 60_000,
  })
}

export function useNotificationChannels() {
  return useQuery({
    queryKey: keys.notificationChannels(),
    queryFn: ({ signal }) => notificationsApi.listNotificationChannels(signal),
  })
}

export function useAuthTokens() {
  return useQuery({
    queryKey: keys.authTokens(),
    queryFn: async ({ signal }) => sortTokens(await authApi.listTokens(signal)),
  })
}

/** Closes one session: optimistic removal, rolled back on error. */
export function useRevokeToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => authApi.revokeToken(token),
    onMutate: async (token) => {
      await queryClient.cancelQueries({ queryKey: keys.authTokens() })
      const previous = queryClient.getQueryData<AuthToken[]>(keys.authTokens())
      queryClient.setQueryData<AuthToken[]>(keys.authTokens(), (old) =>
        old?.filter((x) => x.token !== token),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(keys.authTokens(), ctx?.previous),
    onSuccess: () => toaster.success(t('account.sessions.closed')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.authTokens() }),
  })
}

/** `DELETE /auth/tokens`: every session but the current one (spec). */
export function useRevokeOtherTokens() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.revokeAllTokens(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: keys.authTokens() })
      const previous = queryClient.getQueryData<AuthToken[]>(keys.authTokens())
      queryClient.setQueryData<AuthToken[]>(keys.authTokens(), (old) =>
        old?.filter((x) => x.current),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(keys.authTokens(), ctx?.previous),
    onSuccess: () => toaster.success(t('account.sessions.closedOthers')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.authTokens() }),
  })
}

/**
 * `PATCH /user/{id}` with the changed profile fields plus the current password (required by the
 * API). Errors are shown under «Contraseña actual», so the global toast is silenced.
 */
export function useUpdateProfile() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: (v: { patch: Partial<ProfileValues>; password: string }) =>
      userApi.updateUser(session.user!.id, toProfilePatch(v.patch, v.password)),
    meta: { silent: true },
    onSuccess: () => session.refreshUser(),
  })
}

/** `PATCH /notifications/preferences`, one request per changed cell, in parallel. */
export function useUpdatePreferences() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: (changes: PrefChange[]) =>
      Promise.all(
        changes.map((c) =>
          notificationsApi.setNotificationPreference({
            notification: c.type,
            channel: c.channel === 'mail' ? 'MAIL' : 'TELEGRAM',
            toggleTo: c.toggleTo,
          }),
        ),
      ),
    onSuccess: () => session.refreshUser(),
  })
}

export function useUploadPhoto() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: (file: Blob) => userApi.uploadUserImage(session.user!.id, file),
    onSuccess: async () => {
      await session.refreshUser()
      toaster.success(t('account.photo.uploaded'))
    },
  })
}

export function useDeletePhoto() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: () => userApi.deleteUserImage(session.user!.id),
    onSuccess: async () => {
      await session.refreshUser()
      toaster.success(t('account.photo.removed'))
    },
  })
}

export function useChangeEmail() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: (v: { email: string; password: string }) =>
      userApi.updateEmail(session.user!.id, v.email, v.password),
    meta: { silent: true },
    onSuccess: async () => {
      await session.refreshUser()
      toaster.success(t('account.security.emailChanged'))
    },
  })
}

export function useChangePassword() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: (v: { current: string; next: string }) =>
      userApi.updatePassword(session.user!.id, { password: v.current, newPassword: v.next }),
    meta: { silent: true },
    onSuccess: () => toaster.success(t('account.security.passwordChanged')),
  })
}

export function useUnlinkTelegram() {
  const queryClient = useQueryClient()
  const session = useSessionStore()
  return useMutation({
    mutationFn: () => userApi.unlinkTelegram(session.user!.id),
    onSuccess: async () => {
      await Promise.all([
        session.refreshUser(),
        queryClient.invalidateQueries({ queryKey: keys.notificationChannels() }),
      ])
      toaster.success(t('account.telegram.unlinked'))
    },
  })
}
