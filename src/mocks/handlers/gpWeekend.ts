import { http, HttpResponse } from 'msw'
import { fail, ok } from '../envelope'
import { grandPrixes } from '../fixtures'
import {
  calculations,
  calculationsFor,
  grid,
  results,
  tipps,
  weekendPoints,
  weekendRuleset,
  WEEKEND_GP,
  WEEKEND_SEASON,
  WEEKEND_SESSIONS,
} from '../fixtures/gp'

/** Endpoints of the GP weekend (G2). Registered before the generic ones (see handlers/index). */
export const gpWeekendHandlers = [
  // The real API answers 200 with `success:false` for an unknown GP.
  http.get('*/v2/gps/:competition/:season/:gp', ({ params }) => {
    const gp = grandPrixes.find((g) => String(g.id) === params.gp)
    return gp ? ok(gp) : fail(200, 'Gran premio inválido')
  }),
  http.get('*/v2/gps/:c/:s/:gp/sessions/:session/results', ({ params }) =>
    ok(results(Number(params.session))),
  ),
  http.get('*/v2/gps/:c/:s/:gp/sessions/:session/grid', ({ params }) =>
    ok(grid(Number(params.session))),
  ),
  http.get('*/v2/gps/:c/:s/:gp/sessions/:session/tipps/:community/calculations', ({ params }) =>
    ok(Number(params.session) === WEEKEND_SESSIONS.sprint ? calculations : calculationsFor({}, 0)),
  ),
  // Own predictions of the weekend GP; other GPs fall through to the calendar handler (G1).
  http.get('*/v2/gps/:c/:s/:gp/sessions/:session/tipps/:community', ({ params }) =>
    Number(params.gp) === WEEKEND_GP ? ok(tipps(Number(params.session))) : undefined,
  ),
  http.get('*/v2/rulesets/:community/:comp/:season/:gp', () => ok(weekendRuleset)),
  // Real API: the community/season route of the spec does not exist (404 text/plain).
  http.get(
    '*/v2/rulesets/:community/:comp/:season',
    ({ request }) =>
      new HttpResponse(`Endpoint GET ${new URL(request.url).pathname} not found`, { status: 404 }),
  ),
  // Falls through (returns nothing) for any other GP: the circuit handlers answer those.
  http.get('*/v2/communities/:c/:comp/:season/points/:gp', ({ params }) =>
    Number(params.gp) === WEEKEND_GP && Number(params.season) === WEEKEND_SEASON
      ? ok(weekendPoints())
      : undefined,
  ),
]
