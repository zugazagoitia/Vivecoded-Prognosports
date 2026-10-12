import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

test.describe('RankNav (N3)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`has no serious a11y violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/dev/ranknav')
      await expect(page.getByRole('heading', { level: 1, name: 'Ranking' })).toBeVisible()
      await page.getByLabel('Diferencia de puntos (Gap)').check()
      await page.getByLabel('Mapa de calor por GP').check()
      await expectNoSeriousA11yViolations(page)
    })
  }

  test('progress bar exposes its values', async ({ page }) => {
    await page.goto('/dev/ranknav')
    const bar = page.getByRole('progressbar', { name: 'Progreso de la temporada' })
    await expect(bar).toHaveAttribute('aria-valuenow', '7')
    await expect(bar).toHaveAttribute('aria-valuemax', '24')
  })

  test('flags show and hide sections; season change keeps the view', async ({ page, isMobile }) => {
    await page.goto('/dev/ranknav')
    if (isMobile) {
      await page.getByRole('button', { name: /Ver todas las vistas/ }).click()
      const sheet = page.getByRole('dialog', { name: 'Todas las vistas' })
      await expect(sheet.getByRole('link', { name: 'Evolución' })).toHaveCount(0)
      await page.keyboard.press('Escape')
    } else {
      const nav = page.getByRole('navigation', { name: 'Secciones del ranking' })
      await expect(nav.getByRole('link')).toHaveText([
        'Resumen',
        'Clasificación',
        'Por Gran Premio',
      ])
      await expect(page.getByRole('navigation', { name: 'Vistas' })).toHaveCount(0)
    }
    await page.getByLabel('Diferencia de puntos (Gap)').check()
    if (isMobile) {
      await page.getByRole('button', { name: 'Evolución' }).click()
    } else {
      await page
        .getByRole('navigation', { name: 'Secciones del ranking' })
        .getByRole('link', { name: 'Evolución' })
        .click()
    }
    await expect(page.getByTestId('current')).toHaveText('x/2026/evolucion/gap')
    await page.getByRole('button', { name: '2025' }).click()
    await expect(page.getByTestId('current')).toHaveText('x/2025/evolucion/gap')
    await page.getByLabel('Comunidad', { exact: true }).selectOption('y')
    await expect(page.getByTestId('current')).toHaveText('y/2025/evolucion/gap')
  })

  test('desktop: tab targets are keyboard operable', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop tabs')
    await page.goto('/dev/ranknav')
    const link = page
      .getByRole('navigation', { name: 'Secciones del ranking' })
      .getByRole('link', { name: 'Resumen' })
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('current')).toHaveText('x/2026/resumen')
    await expect(link).toHaveAttribute('aria-current', 'page')
  })

  test('mobile: three segments, «Ver todas las vistas» and 44px targets', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile only')
    await page.goto('/dev/ranknav')
    const group = page.getByRole('group', { name: 'Secciones principales' })
    await expect(group.getByRole('button')).toHaveText(['Clasificación', 'Por Gran Premio'])
    await page.getByLabel('Diferencia de puntos (Gap)').check()
    await expect(group.getByRole('button')).toHaveText([
      'Clasificación',
      'Por Gran Premio',
      'Evolución',
    ])
    const box = await page.getByRole('button', { name: /Ver todas las vistas/ }).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    const seg = await group.getByRole('button').first().boundingBox()
    expect(seg!.height).toBeGreaterThanOrEqual(44)
  })
})
