import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

// Proves the axe check bites: an icon button without an accessible name must fail it.
test('axe fails on an icon button without accessible name', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => {
    const b = document.createElement('button')
    b.innerHTML =
      '<svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6"/></svg>'
    document.body.append(b)
  })
  await expect(expectNoSeriousA11yViolations(page)).rejects.toThrow(/button-name/)
})
