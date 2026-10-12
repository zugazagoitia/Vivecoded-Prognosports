import type { Locator, Page } from '@playwright/test'
import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON } from '../src/mocks/fixtures/gp'
import { expect, test } from './support/fixtures'

// The reviewer flag panel only mounts outside production: this spec runs against the beta-mode
// build (dist-panel/, port 4175). Bounding boxes only, no screenshots.
const PANEL_URL = 'http://localhost:4175'
const OPEN_KEY = 'prognosports.flagPanel.open'

type Rect = { left: number; top: number; right: number; bottom: number }

async function rect(loc: Locator): Promise<Rect> {
  const box = await loc.boundingBox()
  if (!box) throw new Error('element has no box')
  return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height }
}

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

async function expectClear(page: Page, panel: Locator) {
  const mine = await rect(panel)
  const bars = page.locator('.tab-bar, [data-bottom-bar]')
  for (const bar of await bars.all()) {
    if (!(await bar.isVisible())) continue
    const other = await rect(bar)
    expect(
      intersects(mine, other),
      `panel ${JSON.stringify(mine)} vs bar ${JSON.stringify(other)}`,
    ).toBe(false)
  }
}

test.describe('flag panel on phones', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1280) > 900, 'phone viewport only')
  test.use({ baseURL: PANEL_URL })

  for (const open of [false, true]) {
    test.describe(open ? 'expanded' : 'collapsed', () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript(
          ([key, value]) => localStorage.setItem(key as string, value as string),
          [OPEN_KEY, open ? '1' : '0'],
        )
      })

      for (const url of ['/home', '/comunidades']) {
        test(`${url}: never overlaps the tab bar`, async ({ authedPage: page }) => {
          await page.goto(url)
          const tabs = page.locator('.tab-bar')
          await expect(tabs).toBeVisible()
          const panel = page.locator(open ? '.flag-panel' : '.flag-panel .bubble')
          await expect(panel).toBeVisible()
          await expectClear(page, panel)
        })
      }

      test('predict: stays above the save bar and under the driver sheet', async ({
        authedPage: page,
      }) => {
        await page.clock.setFixedTime(new Date(WEEKEND_NOW))
        await page.goto(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/pronosticar/60`)
        const saveBar = page.locator('[data-bottom-bar]')
        await expect(saveBar).toBeVisible()
        const panel = page.locator(open ? '.flag-panel' : '.flag-panel .bubble')
        await expect(panel).toBeVisible()
        // The save bar sticks to the bottom while the slots are on screen; check at the top and bottom.
        for (const y of [0, 1_000_000]) {
          await page.evaluate((top) => window.scrollTo(0, top), y)
          await expect
            .poll(async () => {
              const mine = await rect(panel)
              const bars = [await rect(saveBar), await rect(page.locator('.tab-bar'))]
              return bars.some((b) => intersects(mine, b))
            })
            .toBe(false)
        }
        // A sheet (z-50) covers the panel instead of the other way round.
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.getByRole('button', { name: '1.º: vacío' }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        const box = await rect(page.locator('.flag-panel .bubble'))
        const covered = await page.evaluate(
          ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.flag-panel'),
          { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 },
        )
        expect(covered).toBe(false)
      })
    })
  }
})
