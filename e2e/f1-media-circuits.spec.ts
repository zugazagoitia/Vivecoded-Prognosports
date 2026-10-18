import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Circuit 18 (Marina Bay in the mocks) has coordinates, so the open outline is available.
const PATH = '/circuits/18'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`circuit outlines (F1 icons on, ${scheme})`, () => {
    test.use({ colorScheme: scheme })

    test('F1 icon is shown, axe clean', async ({ page }) => {
      await page.route('https://media.formula1.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
      )
      await page.goto(PATH)
      const icon = page.getByTestId('circuit-outline-f1')
      await expect(icon).toBeVisible()
      await expect(icon).toHaveAttribute(
        'src',
        /media\.formula1\.com\/image\/upload\/.*_Circuit\.png/,
      )
      await expect(page.getByTestId('circuit-outline-open')).toHaveCount(0)
      await expectNoSeriousA11yViolations(page)
    })

    test('falls back to the open outline when the F1 image fails', async ({
      page,
      browserName,
    }) => {
      await page.route('https://media.formula1.com/**', (route) => route.abort())
      await page.goto(PATH)
      const outline = page.getByTestId('circuit-outline-open')
      await expect(outline).toBeVisible()
      await expect(outline).toHaveAccessibleName(/Trazado del circuito de Marina Bay/)
      await expect(page.getByTestId('circuit-outline-f1')).toHaveCount(0)
      await expectNoSeriousA11yViolations(page)
      if (browserName === 'chromium' && scheme === 'light') {
        await expect(outline).toHaveScreenshot('open-outline.png')
      }
    })
  })
}
