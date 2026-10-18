import { WEEKEND_GP, WEEKEND_NOW, WEEKEND_SEASON } from '../src/mocks/fixtures/gp'
import { expect, test } from './support/fixtures'

// Headshots flag off (as in production): no request to media.formula1.com or OpenF1 headshots.
test('flag off: no request to media.formula1.com, avatars instead', async ({
  authedPage: page,
}) => {
  const hosts: string[] = []
  page.on('request', (r) => hosts.push(new URL(r.url()).hostname))
  await page.route('https://api.jolpi.ca/**', (route) =>
    route.fulfill({ status: 500, body: '{}', contentType: 'application/json' }),
  )
  await page.clock.setFixedTime(new Date(WEEKEND_NOW))
  await page.goto(`/gps/1/${WEEKEND_SEASON}/${WEEKEND_GP}/pronosticar/1`)
  await expect(page.getByText('Faltan 5 pilotos')).toBeVisible()
  expect(hosts).not.toContain('media.formula1.com')
  expect(hosts).not.toContain('api.openf1.org')
})
