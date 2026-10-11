import { MutationCache, QueryClient } from '@tanstack/vue-query'
import { ApiError } from '@/api'
import { messageFor } from '@/api/messages'
import { toaster } from '@/composables/useToast'
import { reportError } from '@/lib/report'

/** Retry up to 2 times, but never on 4xx (401/403/404...) or contract/validation failures. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.kind === 'contract' || error.kind === 'validation') return false
    if (error.status >= 400 && error.status < 500) return false
  }
  return failureCount < 2
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    // Default for mutations: an error toast. Opt out with `meta: { silent: true }`.
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return
        reportError(error, 'mutation')
        toaster.error(messageFor(error))
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
    },
  })
}

/** App-wide singleton (stores need it to clear / invalidate). */
export const queryClient = createQueryClient()
