import { grandPrixes, mockGrandPrix, REFERENCE_NOW, season, users } from './index'

/** Previous season offered in the season selector. */
export const previousSeason = { id: 9, name: '2025', totalEvents: 22 }

/** `GET /competitions/{id}/seasons`. */
export const competitionSeasons = [season, previousSeason]

/** All 22 rounds of the previous season, long disputed. */
export const previousSeasonGps = Array.from({ length: 22 }, (_, i) => {
  const gp = mockGrandPrix(i + 1)
  const shift = (d: string) => new Date(Date.parse(d) - 365 * 86_400_000).toISOString()
  return {
    ...gp,
    id: 900 + i + 1,
    season: previousSeason,
    lastSessionDate: shift(gp.lastSessionDate!),
    sessions: gp.sessions?.map((s) => ({
      ...s,
      id: 9000 + (i + 1) * 10 + (s.id % 10),
      date: shift(s.date!),
    })),
  }
})

/**
 * `GET /communities/{c}/{comp}/{season}/points`: map `grandPrixId -> UserPoints[]` for the GPs
 * already disputed at REFERENCE_NOW (the real API only lists GPs that have points).
 */
export function communitySeasonPoints(seasonId: number): Record<string, unknown[]> {
  const list = seasonId === previousSeason.id ? previousSeasonGps : grandPrixes
  const out: Record<string, unknown[]> = {}
  const running = new Map<number, number>()
  for (const gp of list) {
    if (Date.parse(gp.lastSessionDate ?? '') > Date.parse(REFERENCE_NOW)) continue
    const sessions = [...(gp.sessions ?? [])].sort(
      (a, b) => Date.parse(a.date!) - Date.parse(b.date!),
    )
    out[String(gp.id)] = users.map((user) => {
      const pointsInGP = ((Number(user.id) * 7 + gp.round! * 5) % 37) + 18
      const accumulatedPoints = (running.get(Number(user.id)) ?? 0) + pointsInGP
      running.set(Number(user.id), accumulatedPoints)
      // Split over the sessions (the race, the last one, takes the remainder), keyed by session id.
      const share = Math.floor(pointsInGP / Math.max(sessions.length, 1))
      const pointsBySession = Object.fromEntries(
        sessions.map((s, i) => [
          String(s.id),
          i === sessions.length - 1 ? pointsInGP - share * (sessions.length - 1) : share,
        ]),
      )
      return { user, pointsInGP, accumulatedPoints, pointsBySession }
    })
  }
  return out
}

/** Session of the next GP (round 18) the mock user already predicted: the sprint (id 181). */
export const PREDICTED_SESSION_IDS = [181]

/** `GET .../sessions/{session}/tipps/{community}` for the mock user. */
export function ownTipps(sessionId: number) {
  if (!PREDICTED_SESSION_IDS.includes(sessionId)) return []
  return [1, 2, 3, 4].map((position) => ({
    position,
    driver: { id: 10 + position, firstname: 'Piloto', lastname: String(position) },
  }))
}
