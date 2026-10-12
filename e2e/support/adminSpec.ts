import type { Page } from '@playwright/test'
import { REFERENCE_NOW } from '../../src/mocks/fixtures'
import { mockAdminApi } from './admin'
import { expect, expectNoSeriousA11yViolations } from './fixtures'

export const isPhone = (viewport: { width: number } | null) => (viewport?.width ?? 1280) < 768

/** Frozen clock + admin mocks, then opens `path` (the mock user 1 is an admin). */
export async function openAdminPage(page: Page, path: string) {
  await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  const calls = await mockAdminApi(page)
  await page.goto(path)
  return calls
}

export async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}

export { expectNoSeriousA11yViolations }
