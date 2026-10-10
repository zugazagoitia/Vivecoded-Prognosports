import AxeBuilder from '@axe-core/playwright'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// F3 catalogue (/dev/componentes): axe in both themes, plus the open overlays.
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`componentes ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    test('axe: sin violaciones serias o críticas', async ({ page }) => {
      await page.goto('/dev/componentes')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectNoSeriousA11yViolations(page)
    })

    test('axe: tooltip abierto con el teclado', async ({ page, isMobile }) => {
      test.skip(isMobile, 'el tooltip se abre con foco de teclado (escritorio)')
      await page.goto('/dev/componentes')
      // Reach the trigger by keyboard so it matches :focus-visible.
      await expect(async () => {
        await page.getByRole('button', { name: 'Más información' }).focus()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Tab')
        await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 1000 })
      }).toPass({ timeout: 10_000 })
      await expectNoSeriousA11yViolations(page)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('tooltip')).toBeHidden()
    })

    test('axe: menú abierto, Escape lo cierra', async ({ page }) => {
      await page.goto('/dev/componentes')
      await page.getByRole('button', { name: 'Cuenta' }).click()
      await expect(page.getByRole('menu')).toBeVisible()
      await expectNoSeriousA11yViolations(page)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menu')).toBeHidden()
    })

    test('axe: modal abierto, devuelve el foco al cerrar', async ({ page }) => {
      await page.goto('/dev/componentes')
      const trigger = page.getByRole('button', { name: 'Eliminar comunidad' })
      await trigger.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      // aria-hidden-focus: the page behind a modal is aria-hidden by design while the focus
      // trap keeps the keyboard inside the dialog, so axe's check is a known false positive here.
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['aria-hidden-focus'])
        .analyze()
      expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
        [],
      )
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toBeHidden()
      await expect(trigger).toBeFocused()
    })
  })
}

test('objetivos táctiles de 44 px en móvil', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'solo en el proyecto móvil')
  await page.goto('/dev/componentes')
  const small: string[] = []
  const selectors = [
    'button:visible:not([role="switch"])', // switches: the whole 44px label row toggles
    '[role="tab"]:visible',
    '[aria-pressed]:visible',
    'nav[aria-label="Paginación"] button:visible',
  ]
  for (const sel of selectors) {
    for (const el of await page.locator(sel).all()) {
      const box = await el.boundingBox()
      if (box && box.height < 43.5)
        small.push(`${sel} ${(await el.textContent())?.trim()}: ${box.height}`)
    }
  }
  expect(small).toEqual([])
})
