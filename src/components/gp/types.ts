import type { RaceSession } from '@/api/schemas'
import type { SessionState } from '@/components/states/sessionState'
import type { SessionStatus } from '@/lib/gp'

export type TzMode = 'mine' | 'circuit'

export interface HistoryEntry {
  year: string
  points: number
}

/** One session of the weekend, ready to render in the timeline (desktop) or list (mobile). */
export interface SessionVm {
  session: RaceSession
  /** Display name: «Clasificación sprint». */
  name: string
  /** «Vie 9 · 17:30» in the zone shown. */
  when: string
  state: SessionState
  hasPrediction: boolean
  status: SessionStatus
  /** Literal tag text («Cierra en 1 h 32 min»). */
  statusText: string
}
