import { http } from 'msw'
import { ok } from '../envelope'
import { simulatedCalculations } from '../fixtures/simulator'

/** Endpoints of the simulator (G6). The POST computes but never stores anything. */
export const simulatorHandlers = [
  http.post(
    '*/v2/gps/:c/:s/:gp/sessions/:session/tipps/:community/calculations',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        results?: { position: number; driver: { id: number } }[]
      }
      return ok(simulatedCalculations(Number(params.session), body.results ?? []))
    },
  ),
]
