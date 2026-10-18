import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON } from '../src/mocks/fixtures/gp'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// G3 «forma en el campeonato» (#206 ideas 3 y 5), with 2025 recorded fixtures. The e2e build has
// VITE_FF_PUBLIC_HEADSHOTS on (build-e2e turns every flag on); the flags-off spec covers it off.
const FIX = path.resolve('src/lib/publicData/__fixtures__')
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)
const BASE = `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/pronosticar/1`

const read = (f: string) => readFileSync(path.join(FIX, f), 'utf8')

async function mockSources(page: Page, mode: 'ok' | 'fail' = 'ok') {
  const calls = { jolpica: [] as string[], openf1: [] as string[], media: [] as string[] }
  await page.route('https://api.jolpi.ca/**', (route) => {
    const url = route.request().url()
    calls.jolpica.push(url)
    if (mode === 'fail')
      return route.fulfill({
        status: 500,
        headers: CORS,
        contentType: 'application/json',
        body: '{}',
      })
    const file = url.includes('driverstandings')
      ? 'standings-2025-r2.json'
      : 'jolpica-results-2025-r2.json'
    return route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: read(file),
    })
  })
  await page.route('https://api.openf1.org/**', (route) => {
    calls.openf1.push(route.request().url())
    return route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: read('headshots-drivers.json'),
    })
  })
  await page.route('https://media.formula1.com/**', (route) => {
    calls.media.push(route.request().url())
    return route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PIXEL })
  })
  return calls
}

test.describe('Predict form context (G3, #206)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('shows standings position, last results and headshots; axe', async ({
        authedPage: page,
        browserName,
      }) => {
        const calls = await mockSources(page)
        await page.clock.setFixedTime(new Date(WEEKEND_NOW))
        await page.goto(BASE)
        const card = page.getByTestId('form-context')
        await expect(card).toBeVisible()
        await expect(card.getByText('Fuente: Jolpica-F1 (Ergast)')).toBeVisible()
        await expect(card.getByRole('list', { name: 'Forma de los pilotos' })).toBeVisible()
        expect(calls.jolpica.some((u) => u.includes('driverstandings.json'))).toBe(true)
        await expect(card.locator('img[src^="https://media.formula1.com/"]').first()).toBeVisible()
        await expect.poll(() => calls.media.length).toBeGreaterThan(0)
        await expectNoSeriousA11yViolations(page)
        if (scheme === 'light' && browserName === 'chromium')
          await expect(card).toHaveScreenshot('gp-public-form.png', { maxDiffPixelRatio: 0.02 })
      })
    })
  }

  test('source failure leaves the form intact', async ({ authedPage: page }) => {
    await mockSources(page, 'fail')
    await page.clock.setFixedTime(new Date(WEEKEND_NOW))
    await page.goto(BASE)
    await expect(page.getByText('Faltan 5 pilotos')).toBeVisible()
    await expect(page.getByTestId('form-context')).toHaveCount(0)
  })
})
