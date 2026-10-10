import { http } from 'msw'
import { ok } from '../envelope'
import { circuits, competition, season } from '../fixtures'

export const competitionHandlers = [
  http.get('*/v2/competitions', () => ok([competition])),
  http.get('*/v2/competitions/:id/seasons', () => ok([season])),
  http.get('*/v2/seasons/current/:competition', () => ok(season)),
  http.get('*/v2/seasons/:season/circuits', () => ok(circuits)),
]
