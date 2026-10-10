import { authHandlers } from './auth'
import { communityHandlers } from './communities'
import { competitionHandlers } from './competitions'
import { gpHandlers } from './gps'
import { userHandlers } from './user'

/** Default handlers shared by tests (setupServer) and `VITE_API_MOCK=true` dev (setupWorker). */
export const handlers = [
  ...authHandlers,
  ...userHandlers,
  ...communityHandlers,
  ...competitionHandlers,
  ...gpHandlers,
]
