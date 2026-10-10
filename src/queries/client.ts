import { QueryClient } from '@tanstack/vue-query'
import { ApiError } from '@/api'

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
