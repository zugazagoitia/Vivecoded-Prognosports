import { authHandlers } from './auth'
import { calendarHandlers } from './calendar'
import { circuitHandlers } from './circuits'
import { communityHandlers } from './communities'
import { competitionHandlers } from './competitions'
import { gpHandlers } from './gps'
import { gpWeekendHandlers } from './gpWeekend'
import { predictHandlers } from './predict'
import { simulatorHandlers } from './simulator'
import { userHandlers } from './user'

/** Default handlers shared by tests (setupServer) and `VITE_API_MOCK=true` dev (setupWorker). */
export const handlers = [
  ...predictHandlers,
  ...simulatorHandlers,
  ...gpWeekendHandlers,
  ...calendarHandlers,
  ...authHandlers,
  ...userHandlers,
  ...communityHandlers,
  ...competitionHandlers,
  ...gpHandlers,
  ...circuitHandlers,
]
