import { http } from 'msw'
import { ok } from '../envelope'
import { competition, season } from '../fixtures'

export const competitionHandlers = [
  http.get('*/v2/competitions', () => ok([competition])),
  http.get('*/v2/competitions/:id/seasons', () => ok([season])),
  http.get('*/v2/seasons/current/:competition', () => ok(season)),
]
