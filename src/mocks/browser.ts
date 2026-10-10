import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/** Starts the service worker (dev, `VITE_API_MOCK=true`). */
export function startMocking() {
  return worker.start({ onUnhandledFrame: 'bypass' })
}
