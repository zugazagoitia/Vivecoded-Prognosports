import { http } from 'msw'
import { fail, ok } from '../envelope'
import { WEEKEND_GP } from '../fixtures/gp'
import { gpDrivers } from '../fixtures/predict'

/**
 * Endpoints of the predict screen (G3). Registered before the generic ones (see handlers/index).
 * The write answers `200 "ok"` (`text/plain` in the spec) without keeping anything: tests that
 * need to read the saved prediction back override the GET with `server.use`.
 */
export const predictHandlers = [
  http.get('*/v2/gps/:c/:s/:gp/drivers', ({ params }) =>
    Number(params.gp) === WEEKEND_GP ? ok(gpDrivers) : undefined,
  ),
  http.post('*/v2/gps/:c/:s/:gp/sessions/:session/tipps/:community', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { tipps?: unknown[] } | null
    return Array.isArray(body?.tipps) ? ok('ok') : fail(400, 'Pronóstico no válido')
  }),
]
