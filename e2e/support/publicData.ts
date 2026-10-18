import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page, Route } from '@playwright/test'

/** Recorded public sources (2025 round 2, sprint weekend) served in place of Jolpica and OpenF1. */
const FIXTURES = path.resolve('src/lib/publicData/__fixtures__')

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

/**
 * Jolpica file by its last path segment (`<season>/<round>/<file>`). The recorded files are one
 * round (2025 R2) for any season and round: the specs check which season/round was asked for.
 */
const JOLPICA_FILES: Record<string, string> = {
  'results.json': 'jolpica-results-2025-r2.json',
  'sprint.json': 'jolpica-sprint-2025-r2.json',
  'qualifying.json': 'jolpica-qualifying-2025-r2.json',
}

/** OpenF1 file by endpoint (`/v1/<endpoint>`). */
const OPENF1_FILES: Record<string, string> = {
  meetings: 'openf1-meetings-2025.json',
  sessions: 'openf1-sessions-2025-r2.json',
  drivers: 'openf1-drivers-sprint.json',
  session_result: 'openf1-session-result-sprint.json',
  starting_grid: 'openf1-starting-grid-sprint-quali.json',
}

export interface PublicSourceOptions {
  jolpica?: 'ok' | 'fail'
  openf1?: 'ok' | 'fail'
}

export interface PublicSourceCalls {
  jolpica: string[]
  openf1: string[]
}

const fail = (route: Route) =>
  route.fulfill({ status: 500, headers: CORS, contentType: 'application/json', body: '{}' })

const serve = (route: Route, file: string) =>
  route.fulfill({
    status: 200,
    headers: CORS,
    contentType: 'application/json',
    body: readFileSync(path.join(FIXTURES, file), 'utf8'),
  })

/**
 * Routes the public data hosts (api.jolpi.ca, api.openf1.org) to the recorded fixtures, or makes
 * them fail with HTTP 500. Every request is recorded so specs can check which source was asked.
 */
export async function mockPublicSources(
  page: Page,
  { jolpica = 'ok', openf1 = 'ok' }: PublicSourceOptions = {},
): Promise<PublicSourceCalls> {
  const calls: PublicSourceCalls = { jolpica: [], openf1: [] }
  await page.route('https://api.jolpi.ca/**', (route) => {
    const url = route.request().url()
    calls.jolpica.push(url)
    if (jolpica === 'fail') return fail(route)
    const file = JOLPICA_FILES[new URL(url).pathname.split('/').pop() ?? '']
    return file ? serve(route, file) : route.fulfill({ status: 404, headers: CORS, body: '{}' })
  })
  await page.route('https://api.openf1.org/**', (route) => {
    const url = route.request().url()
    calls.openf1.push(url)
    if (openf1 === 'fail') return fail(route)
    const file = OPENF1_FILES[new URL(url).pathname.split('/').pop() ?? '']
    return file ? serve(route, file) : route.fulfill({ status: 404, headers: CORS, body: '[]' })
  })
  return calls
}
