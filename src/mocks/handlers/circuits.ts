import { http } from 'msw'
import { fail, ok } from '../envelope'
import { circuitDetail, gpPoints, MOCK_SEASON_AVERAGE, variantGps } from '../fixtures/circuit'

export const circuitHandlers = [
  http.get('*/v2/circuits/:id', ({ params }) => {
    const circuit = circuitDetail(Number(params.id))
    // The real API answers 200 with `success:false` for unknown ids.
    return circuit ? ok(circuit) : fail(200, 'Circuito inválido')
  }),
  http.get('*/v2/circuits/:id/:variant/gps', ({ params }) =>
    ok(variantGps(Number(params.id), Number(params.variant))),
  ),
  http.get('*/v2/communities/:c/:comp/:season/points/:gp', ({ params }) =>
    ok(gpPoints(Number(params.gp), Number(params.season))),
  ),
  http.get('*/v2/user/:u/communities/:c/:comp/:season/resume', () =>
    ok({
      average: MOCK_SEASON_AVERAGE,
      totalPoints: 600,
      wonGrandPrixes: [{ id: 3 }, { id: 9 }],
      standings: 4,
      totalHits: 48,
    }),
  ),
]
