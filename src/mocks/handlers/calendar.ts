import { http } from 'msw'
import { ok } from '../envelope'
import {
  communitySeasonPoints,
  competitionSeasons,
  ownTipps,
  previousSeason,
  previousSeasonGps,
} from '../fixtures/gps'

/** GP calendar (G1): season list, season points map and own predictions. Registered first. */
export const calendarHandlers = [
  http.get('*/v2/competitions/:id/seasons', () => ok(competitionSeasons)),
  http.get('*/v2/gps/:competition/:season', ({ params }) =>
    // Other seasons fall through to the default handler.
    String(params.season) === String(previousSeason.id) ? ok(previousSeasonGps) : undefined,
  ),
  http.get('*/v2/communities/:c/:comp/:season/points', ({ params }) =>
    ok(communitySeasonPoints(Number(params.season))),
  ),
  http.get('*/v2/gps/:comp/:season/:gp/sessions/:session/tipps/:community', ({ params }) =>
    ok(ownTipps(Number(params.session))),
  ),
]
