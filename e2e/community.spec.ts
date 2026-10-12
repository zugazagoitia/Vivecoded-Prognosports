import { REFERENCE_NOW } from '../src/mocks/fixtures'
import {
  COMMUNITY_JOINED,
  COMMUNITY_OUTSIDE,
  COMMUNITY_OWNED,
} from '../src/mocks/fixtures/community'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const OWN = `/comunidades/${COMMUNITY_OWNED}`

test.describe('Community home (H5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  test('requires a session', async ({ page }) => {
    await page.goto(OWN)
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('members tab: header, table, aside, axe', async ({ authedPage: page }) => {
        await page.goto(OWN)
        await expect(page.getByRole('heading', { level: 1, name: 'Peña Paddock' })).toBeVisible()
        const table = page.getByRole('table', { name: 'Clasificación de la comunidad' })
        await expect(table.getByRole('row')).toHaveCount(13)
        await expect(page.getByText('Mostrando 12 de 12 jugadores')).toBeVisible()
        await expect(page.getByRole('textbox', { name: 'Enlace de invitación' })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        )
        expect(overflow).toBe(false)
      })

      test('rules and seasons tabs, axe', async ({ authedPage: page }) => {
        await page.goto(`${OWN}?tab=reglas`)
        await expect(page.getByText('Máximo por sesión (sin bonus)')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await page.goto(`${OWN}?tab=temporadas`)
        await expect(page.getByRole('table', { name: /Temporadas anteriores/ })).toBeVisible()
        await expectNoSeriousA11yViolations(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await page.goto(OWN)
        await expect(page.getByText('Mostrando 12 de 12 jugadores')).toBeVisible()
        await expect(page.getByRole('heading', { name: /en la comunidad$/ })).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await expect(page).toHaveScreenshot(`comunidad-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
          // ▲/▼ glyph fallback font differs between CI runner and Playwright image.
          maxDiffPixelRatio: 0.012,
        })
      })
    })
  }

  test('leave asks for confirmation and goes to the list', async ({ authedPage: page }) => {
    await page.goto(`/comunidades/${COMMUNITY_JOINED}`)
    await page.getByRole('button', { name: 'Salir de la comunidad' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Salir' }).click()
    await expect(page).toHaveURL(/\/comunidades$/)
  })

  test('unknown community shows its own 404, a non-member is redirected', async ({
    authedPage: page,
  }) => {
    await page.goto('/comunidades/999')
    await expect(
      page.getByRole('heading', { level: 1, name: 'No se ha encontrado la comunidad' }),
    ).toBeVisible()
    await expectNoSeriousA11yViolations(page)
    await page.goto(`/comunidades/${COMMUNITY_OUTSIDE}`)
    await expect(page).toHaveURL(/\/comunidades$/)
  })
})
