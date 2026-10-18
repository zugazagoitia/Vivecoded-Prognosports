import type { Page } from '@playwright/test'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON } from '../src/mocks/fixtures/gp'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// GP detail of the fixture weekend: its circuit is in «Estados Unidos», so the header shows the
// US flag (issue #223). Every image host is answered by page.route: no real network.
const PATH = `/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}`

// 1×1 transparent PNG, enough for any image request the page could make.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

async function mockImageHosts(page: Page): Promise<string[]> {
  const requested: string[] = []
  await page.route(/^https:\/\/(media\.formula1\.com|[^/]*basemaps\.cartocdn\.com)\//, (route) => {
    requested.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
  })
  return requested
}

test.describe('F1 media: country flags (#223)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('GP header shows the lazy flag and passes axe', async ({ authedPage: page }) => {
        const requested = await mockImageHosts(page)
        await page.clock.setFixedTime(new Date(WEEKEND_NOW))
        await page.goto(PATH)

        // The flag is the only SVG image in the header; its alt is the f1Media.flag.label text.
        const flag = page.locator('img[src^="data:image/svg"], img[src$=".svg"]')
        await expect(flag).toHaveCount(1)
        await expect(flag).toBeVisible()
        // Circuit maps may load from F1 (F1_TRACK_ICONS is on in e2e); the flag itself must not.
        expect(requested.filter((url) => !url.includes('Circuit'))).toEqual([])
        await expectNoSeriousA11yViolations(page)
      })
    })
  }
})
