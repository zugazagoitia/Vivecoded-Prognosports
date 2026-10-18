import { expect, test } from './support/fixtures'

test('flag off: open outline, no request to media.formula1.com', async ({ page }) => {
  const hosts: string[] = []
  page.on('request', (r) => hosts.push(new URL(r.url()).hostname))
  await page.goto('/circuits/18')
  await expect(page.getByTestId('circuit-outline-open')).toBeVisible()
  await expect(page.getByTestId('circuit-outline-f1')).toHaveCount(0)
  expect(hosts).not.toContain('media.formula1.com')
})
