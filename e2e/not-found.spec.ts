import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Regresión: /404 y /sesion-cerrada salían como texto plano sin estilos.
for (const scheme of ['light', 'dark'] as const) {
  for (const [url, name] of [
    ['/no-existe', 'No se ha encontrado lo que buscabas'],
    ['/a/b/c/d', 'No se ha encontrado lo que buscabas'],
    ['/sesion-cerrada', 'Has cerrado sesión'],
  ] as const) {
    test(`${url} está maquetada y es accesible (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(url)
      const h1 = page.getByRole('heading', { level: 1 })
      await expect(h1).toContainText(name.split('.')[0]!)
      const size = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      expect(size).toBeGreaterThan(20)
      const button = page.locator('#contenido a')
      const bg = await button.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(bg).not.toBe('rgba(0, 0, 0, 0)')
      await expectNoSeriousA11yViolations(page)
    })
  }
}
