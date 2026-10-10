import { z } from 'zod'

/**
 * Zod schemas for the critical API responses. The OpenAPI spec marks almost
 * nothing as required, so only identity fields are required here; the rest is
 * nullish. Unknown keys are stripped, which also removes `hashedPassword`
 * from `User` (§24.8) — it is deliberately not declared.
 */
const n = <T extends z.ZodType>(s: T) => s.nullish()
const id = z.number()

export const UserRankSchema = z.object({
  id: n(id),
  name: n(z.string()),
  color: n(z.string()),
  admin: z.boolean().default(false),
})

export const ConstructorSchema = z.object({
  id,
  name: n(z.string()),
  carname: n(z.string()),
  longname: n(z.string()),
  teamcolor: n(z.string()),
})

export const DriverSchema = z.object({
  id,
  firstname: n(z.string()),
  lastname: n(z.string()),
  code: n(z.string()),
  nationality: n(z.string()),
  birth: n(z.string()),
  color: n(z.string()),
  number: n(z.number()),
  team: n(ConstructorSchema),
})

export const CompetitionSchema = z.object({
  id,
  code: n(z.string()),
  name: n(z.string()),
  fullname: n(z.string()),
  rules: n(z.unknown()),
  currentSeason: n(z.unknown()),
  availableSessions: n(z.unknown()),
})

export const SeasonSchema = z.object({
  id,
  name: n(z.string()),
  totalEvents: n(z.number()),
  competition: n(z.unknown()),
})

export const CircuitVariantSchema = z.object({
  id,
  circuitId: n(z.number()),
  name: n(z.string()),
  distance: n(z.number()),
  turns: n(z.number()),
  hasLayoutImage: n(z.boolean()),
})

export const CircuitSchema = z.object({
  id,
  name: n(z.string()),
  country: n(z.string()),
  locality: n(z.string()),
  latitude: n(z.number()),
  longitude: n(z.number()),
  hasLogoImage: n(z.boolean()),
  variants: n(z.array(CircuitVariantSchema)),
})

export const RaceSessionSchema = z.object({
  id,
  key: n(z.number()),
  name: n(z.string()),
  code: n(z.string()),
  hasGrid: n(z.boolean()),
  hasFastLap: n(z.boolean()),
  grandPrix: n(z.unknown()),
  defineGridOf: n(z.array(z.number())),
  date: n(z.string()),
  uses: n(z.number()),
})

/** Shallow GP reference used for previous/next links (avoids recursion). */
const GrandPrixRefSchema = z.object({
  id,
  name: n(z.string()),
  code: n(z.string()),
  round: n(z.number()),
})

export const GrandPrixSchema = z.object({
  id,
  name: z.string(),
  code: n(z.string()),
  round: z.number(),
  competition: n(CompetitionSchema),
  season: n(SeasonSchema),
  circuit: n(CircuitSchema),
  variant: n(CircuitVariantSchema),
  sessions: n(z.array(RaceSessionSchema)),
  previousGrandPrix: n(GrandPrixRefSchema),
  nextGrandPrix: n(GrandPrixRefSchema),
  lastSessionDate: n(z.string()),
  suspended: n(z.boolean()),
  laps: n(z.number()),
  hasPromoImage: n(z.boolean()),
  hasPointsInGrandPrix: n(z.boolean()),
})

const Count = z.record(z.string(), z.number())

export const UserResumeSchema = z.object({
  totalPoints: n(z.number()),
  standings: n(z.number()),
  average: n(z.number()),
  totalHits: n(z.number()),
  totalPointsBySession: n(Count),
  averagePointsBySession: n(z.record(z.string(), z.number())),
  participationsBySession: n(Count),
  wonSessions: n(z.record(z.string(), z.unknown())),
  wonGrandPrixes: n(z.array(z.unknown())),
  bestGP: n(z.object({ first: z.unknown(), second: z.unknown() })),
  worstGP: n(z.object({ first: z.unknown(), second: z.unknown() })),
})

export const UserSchema = z.object({
  id,
  username: z.string(),
  email: n(z.string()),
  bio: n(z.string()),
  location: n(z.string()),
  birthdate: n(z.string()),
  gender: n(z.string()),
  timeZone: n(z.string()),
  rank: n(UserRankSchema),
  currentCommunity: n(z.unknown()),
  preferences: n(z.record(z.string(), z.unknown())),
  resume: n(UserResumeSchema),
  hasProfileImage: n(z.boolean()),
  verified: n(z.string()),
  created: n(z.string()),
  updated: n(z.string()),
  lastActivity: n(z.string()),
})
export type User = z.infer<typeof UserSchema>

/** Removes `hashedPassword` from any raw user-like object (defence in depth). */
export function sanitizeUser<T extends object>(raw: T): Omit<T, 'hashedPassword'> {
  const { hashedPassword: _omit, ...rest } = raw as T & { hashedPassword?: unknown }
  return rest
}

const RuleMap = z.record(z.string(), z.number())

export const RuleSetDataSchema = z.object({
  predictedPositions: n(z.record(z.string(), z.unknown())),
  pointsByEqualsPosition: n(RuleMap),
  pointsByNextPosition: n(RuleMap),
  pointsByNextOfFollowingPosition: n(RuleMap),
  pointsByPreviousPosition: n(RuleMap),
  pointsByPreviousOfPreviousPosition: n(RuleMap),
  pointsIfIsNotInPodium: n(RuleMap),
  pointsIfIsNotInResults: n(RuleMap),
  pointsByTopScorer: n(z.number()),
})

export const RuleSetSchema = z.object({
  id,
  displayname: n(z.string()),
  description: n(z.string()),
  creator: n(UserSchema),
  public: z.boolean(),
  data: n(RuleSetDataSchema),
})

export const CommunitySchema = z.object({
  id,
  name: z.string(),
  description: n(z.string()),
  competition: n(CompetitionSchema),
  open: z.boolean(),
  invitation: n(z.string()),
  owner: n(UserSchema),
  membersAmount: n(z.number()),
  userIsMember: z.boolean(),
  created: n(z.string()),
  hasImage: n(z.boolean()),
  defaultRuleSet: n(RuleSetSchema),
})

export const PredictionSchema = z.object({
  user: n(UserSchema),
  gp: n(z.unknown()),
  driver: DriverSchema,
  position: z.number(),
  raceSession: n(z.unknown()),
})

export const RaceResultSchema = z.object({
  gp: n(z.unknown()),
  driver: DriverSchema,
  position: z.number(),
  raceSession: n(z.unknown()),
})

export const StartGridPositionSchema = z.object({
  gp: n(z.unknown()),
  session: n(z.unknown()),
  driver: DriverSchema,
  position: z.number(),
  isFromPit: n(z.boolean()),
  note: n(z.string()),
})

export const AuthTokenSchema = z.object({
  user: n(UserSchema),
  token: z.string(),
  createdAt: n(z.string()),
  lastActivityAt: n(z.string()),
  lifetime: z.number(),
  ipAddress: n(z.string()),
  agent: n(z.string()),
  current: z.boolean(),
})

/**
 * Raw `UserPoints` as sent by the backend (with the `stadings` typo, §24.7).
 * The domain model exposes `standingsByHits` / `previousStandingsByHits`.
 */
const UserPointsWire = z.object({
  user: n(UserSchema),
  grandPrix: n(GrandPrixSchema),
  pointsBySession: n(Count),
  pointsInGP: n(z.number()),
  accumulatedPoints: n(z.number()),
  standings: n(z.number()),
  previousStandings: n(z.number()),
  hitsInGP: n(z.number()),
  hitPercentageInGP: n(z.number()),
  hitsBySession: n(Count),
  hitPercentageBySession: n(z.record(z.string(), z.number())),
  stadingsByHits: n(z.number()),
  standingsByHits: n(z.number()),
  previousStadingsByHits: n(z.number()),
  previousStandingsByHits: n(z.number()),
  accumulatedHits: n(z.number()),
  bonusPoints: n(z.number()),
})

export const UserPointsSchema = UserPointsWire.transform(
  ({
    stadingsByHits,
    previousStadingsByHits,
    standingsByHits,
    previousStandingsByHits,
    ...rest
  }) => ({
    ...rest,
    standingsByHits: standingsByHits ?? stadingsByHits,
    previousStandingsByHits: previousStandingsByHits ?? previousStadingsByHits,
  }),
)
export type UserPoints = z.infer<typeof UserPointsSchema>

export const ScoreCalculationsResponseSchema = z.object({
  pointsByPosition: n(z.record(z.string(), z.number())),
  hits: n(z.unknown()),
  hitsBySession: n(z.unknown()),
  totalHits: n(z.number()),
})

export type GrandPrix = z.infer<typeof GrandPrixSchema>
export type RaceSession = z.infer<typeof RaceSessionSchema>
export type Prediction = z.infer<typeof PredictionSchema>
export type RaceResult = z.infer<typeof RaceResultSchema>
export type StartGridPosition = z.infer<typeof StartGridPositionSchema>
export type Driver = z.infer<typeof DriverSchema>
export type Constructor = z.infer<typeof ConstructorSchema>
export type RuleSet = z.infer<typeof RuleSetSchema>
export type RuleSetData = z.infer<typeof RuleSetDataSchema>
export type UserResume = z.infer<typeof UserResumeSchema>
export type Community = z.infer<typeof CommunitySchema>
export type AuthToken = z.infer<typeof AuthTokenSchema>
export type Circuit = z.infer<typeof CircuitSchema>
export type Competition = z.infer<typeof CompetitionSchema>
export type Season = z.infer<typeof SeasonSchema>
