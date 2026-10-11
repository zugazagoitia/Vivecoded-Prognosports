import { http } from 'msw'
import { ok } from '../envelope'
import { communitySeasonPoints, competitionSeasons } from '../fixtures/gps'

/** Ranking (R0-R13): season points of the community and the seasons of the competition. */
export const rankingHandlers = [
  http.get('*/v2/communities/:community/:competition/:season/points', ({ params }) =>
    ok(communitySeasonPoints(Number(params.season))),
  ),
  http.get('*/v2/competitions/:id/seasons', () => ok(competitionSeasons)),
]
