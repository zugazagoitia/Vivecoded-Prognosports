import AxeBuilder from '@axe-core/playwright'
import { expect, test as base, type Page } from '@playwright/test'
import { loginAsMockUser, mockApi } from './api'

/** Fails on `serious` or `critical` violations (requisitos §20.6). */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  // A sticky bar over a control (after scrolling to click) would fail the target-size rule.
  await page.evaluate(() => window.scrollTo(0, 0))
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(
    blocking.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
    'accessibility violations',
  ).toEqual([])
}

type Fixtures = { authedPage: Page }

export const test = base.extend<Fixtures>({
  // Every test gets the API mocked (anonymous unless it uses `authedPage`).
  page: async ({ page }, use) => {
    await mockApi(page)
    await use(page)
  },
  authedPage: async ({ page }, use) => {
    await loginAsMockUser(page)
    await use(page)
  },
})

export { expect }
