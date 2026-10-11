import { authHandlers } from './auth'
import { circuitHandlers } from './circuits'
import { communityHandlers } from './communities'
import { competitionHandlers } from './competitions'
import { gpHandlers } from './gps'
import { gpWeekendHandlers } from './gpWeekend'
import { userHandlers } from './user'

/** Default handlers shared by tests (setupServer) and `VITE_API_MOCK=true` dev (setupWorker). */
export const handlers = [
  ...gpWeekendHandlers,
  ...authHandlers,
  ...userHandlers,
  ...communityHandlers,
  ...competitionHandlers,
  ...gpHandlers,
  ...circuitHandlers,
]
