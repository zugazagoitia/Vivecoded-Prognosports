import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

async function noHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

// Circuit 18 (Marina Bay in the mocks) has two variants.
const PATH = '/circuits/18'
const H1 = { level: 1 as const, name: 'Marina Bay Street Circuit' }

test.describe('circuit detail (P4)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('visitor: map, tabs, GPs, axe, no overflow', async ({ page }) => {
        const authedRequests: string[] = []
        page.on('request', (r) => {
          if (r.headers()['authorization'] && /\/points\/|\/resume/.test(r.url())) {
            authedRequests.push(r.url())
          }
        })
        await page.goto(PATH)
        await expect(page.getByRole('heading', H1)).toBeVisible()
        await expect(
          page.getByRole('img', { name: /Mapa del circuito de Marina Bay/ }),
        ).toBeVisible()
        await expect(page.getByText('© OpenStreetMap contributors © CARTO')).toBeVisible()
        await expect(page.getByRole('tab', { name: 'Layout 2015–2022' })).toBeVisible()
        await expect(page.getByRole('table')).toBeVisible()
        await expect(page.getByText('Tu historial aquí')).toHaveCount(0)
        await expect(
          page.getByRole('columnheader', { name: 'Ganador de la comunidad' }),
        ).toHaveCount(0)
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
        expect(authedRequests).toEqual([])
      })

      test('signed in: winners and no personal history, axe', async ({ authedPage: page }) => {
        await page.goto(PATH)
        await expect(
          page.getByRole('columnheader', { name: 'Ganador de la comunidad' }),
        ).toBeVisible()
        await expect(page.getByText('Tu historial aquí')).toHaveCount(0)
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await page.goto(PATH)
        await expect(
          page.getByRole('columnheader', { name: 'Ganador de la comunidad' }),
        ).toBeVisible()
        if (scheme === 'light')
          await expect(page).toHaveScreenshot(`circuit-detail-${scheme}.png`, {
            fullPage: true,
            mask: [page.getByText(/^v\S+ · build /)],
          })
      })
    })
  }

  test('the variant tab lives in the URL and survives a reload', async ({ page }) => {
    await page.goto(PATH)
    await page.getByRole('tab', { name: 'Layout 2015–2022' }).click()
    await expect(page).toHaveURL(/variant=2/)
    await expect(page.getByText('5,063 km')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('tab', { name: 'Layout 2015–2022' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByText('5,063 km')).toBeVisible()
  })

  test('zoom buttons work and have touch-size targets on phones', async ({ page, isMobile }) => {
    await page.goto(PATH)
    const zoomIn = page.getByRole('button', { name: 'Acercar' })
    await expect(zoomIn).toBeVisible()
    const before = await page.locator('[role=img] img').first().getAttribute('src')
    await zoomIn.click()
    await expect(page.locator('[role=img] img').first()).not.toHaveAttribute('src', before!)
    if (isMobile) expect((await zoomIn.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })

  test('unknown circuit shows the own 404', async ({ page }) => {
    await page.goto('/circuits/9999')
    await expect(page.getByRole('heading', { name: 'Este circuito no existe' })).toBeVisible()
    await expectNoSeriousA11yViolations(page)
  })
})
