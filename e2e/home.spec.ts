import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Saturday 4 July 2026, 09:00 Madrid: the sprint of round 18 closes in 55 min (predicted), the
// qualifying in 4 h 55 min (urgent) and the race in 1 d 6 h 55 min.
const NOW = new Date('2026-07-04T07:00:00.000Z')

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`home (${scheme})`, () => {
    test.use({ colorScheme: scheme })

    test('home: blocks, axe, no overflow, snapshot', async ({ authedPage: page, isMobile }) => {
      await page.clock.setFixedTime(NOW)
      await page.goto('/home')
      await expect(page.getByRole('heading', { level: 1, name: 'Hola, ana' })).toHaveCount(1)
      await expect(page.getByText('Puesto', { exact: true })).toBeVisible()
      if (isMobile) {
        await expect(page.getByRole('timer')).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Diferencia con el líder' })).toBeVisible()
        await expect(page.getByText('Tu entorno', { exact: true })).toBeVisible()
      } else {
        await expect(
          page.getByRole('heading', { name: 'Tu diferencia con el líder' }),
        ).toBeVisible()
        await expect(page.getByText('Cierra pronto')).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Tu entorno en el ranking' })).toBeVisible()
      }
      await page.waitForLoadState('networkidle')
      await expectNoSeriousA11yViolations(page)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow).toBe(false)
      await expect(page).toHaveScreenshot(`home-${scheme}.png`, {
        fullPage: true,
        mask: [page.getByText(/^v\S+ · build /)],
      })
    })
  })
}

test('home desktop: chart modes switch and the table alternative opens', async ({
  authedPage: page,
  isMobile,
}) => {
  test.skip(isMobile, 'desktop chart')
  await page.clock.setFixedTime(NOW)
  await page.goto('/home')
  await page.getByRole('button', { name: 'Posición' }).click()
  await expect(page.getByRole('heading', { name: 'Tu puesto tras cada GP' })).toBeVisible()
  await page.getByRole('button', { name: 'Ver como tabla' }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expectNoSeriousA11yViolations(page)
})

test('home phone: touch targets are at least 44 px', async ({ authedPage: page, isMobile }) => {
  test.skip(!isMobile, 'phone layout')
  await page.clock.setFixedTime(NOW)
  await page.goto('/home')
  const targets = [
    page.getByRole('button', { name: 'Peña Paddock' }),
    page.getByRole('link', { name: /^Pronosticar/ }).first(),
  ]
  for (const t of targets) {
    const box = await t.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(43.5)
  }
})
