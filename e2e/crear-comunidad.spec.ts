import type { Page, Route } from '@playwright/test'
import { REFERENCE_NOW, competition, mockCommunity, users } from '../src/mocks/fixtures'
import { weekendRuleset } from '../src/mocks/fixtures/gp'
import { expect, expectNoSeriousA11yViolations, test } from './support/fixtures'

const me = users[0]!
const created = mockCommunity({ id: 300, name: 'Los del paddock', owner: me, members_amount: 1 })
const privateRuleset = {
  ...weekendRuleset,
  id: 8,
  displayname: 'Doble puntuación',
  isPublic: false,
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

interface Calls {
  rulesets: unknown[]
  communities: unknown[]
}

/** Catalogue and the two creation endpoints (registered after mockApi). Never the real API. */
async function mockCreate(page: Page): Promise<Calls> {
  const calls: Calls = { rulesets: [], communities: [] }
  let made = false
  const send = (route: Route, result: unknown) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, status: 200, code: 0, message: 'OK', result }),
    })
  await page.route('**/v2/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^.*\/v2/, '').replace(/\/$/, '')
    const method = req.method()
    if (method === 'GET' && path === '/competitions') return send(route, [competition])
    if (method === 'GET' && path === '/rulesets')
      return send(route, [weekendRuleset, privateRuleset])
    if (method === 'POST' && path === '/rulesets') {
      calls.rulesets.push(req.postDataJSON())
      return send(route, { ...weekendRuleset, id: 55, isPublic: false })
    }
    if (method === 'POST' && path === '/communities') {
      calls.communities.push(req.postDataJSON())
      made = true
      return send(route, created)
    }
    if (method === 'POST' && path === '/communities/300/image') return send(route, 'ok')
    if (method === 'GET' && /^\/user\/[^/]+\/communities$/.test(path)) {
      return send(route, made ? [created] : [])
    }
    if (method === 'GET' && path === '/communities/300') {
      const { id: _id, ...detail } = created
      return send(route, detail)
    }
    return route.fallback()
  })
  return calls
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
}

const H1 = { level: 1 as const, name: 'Crear comunidad' }
const name = (page: Page) => page.getByRole('textbox', { name: 'Nombre de la comunidad' })

async function ready(page: Page) {
  await page.goto('/comunidades/crear')
  await expect(page.getByRole('heading', H1)).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Temporada' })).toHaveValue('10')
  await expect(page.getByRole('combobox', { name: 'Conjunto de reglas' })).toHaveValue('7')
}

test.describe('Crear comunidad (H4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(REFERENCE_NOW))
  })

  test('requires a session', async ({ page }) => {
    await page.goto('/comunidades/crear')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)comunidades(%2F|\/)crear/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(scheme, () => {
      test.use({ colorScheme: scheme })

      test('existing rules: defaults, axe and no overflow', async ({ authedPage: page }) => {
        await mockCreate(page)
        await ready(page)
        await expect(page.getByRole('radio', { name: /Cerrada/ })).toBeChecked()
        await expect(page.getByRole('radio', { name: /Usar unas reglas existentes/ })).toBeChecked()
        await expect(page.getByText('Fórmula 1 · 2026')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('new rules and validation errors, axe', async ({ authedPage: page }) => {
        await mockCreate(page)
        await ready(page)
        await page.getByRole('radio', { name: /Crear unas nuevas/ }).click()
        await page.getByRole('button', { name: 'Crear comunidad' }).click()
        await expect(page.getByText('Escribe un nombre para la comunidad.')).toBeVisible()
        await expect(name(page)).toBeFocused()
        await expect(page.getByText('Escribe un nombre para las reglas.')).toBeVisible()
        await expectNoSeriousA11yViolations(page)
        await noHorizontalScroll(page)
      })

      test('snapshot', async ({ authedPage: page, browserName }) => {
        test.skip(browserName !== 'chromium', 'screenshots are Chromium-only')
        await mockCreate(page)
        await ready(page)
        await name(page).fill('Los del paddock')
        await page.getByRole('radio', { name: /Abierta/ }).click()
        await expect(page).toHaveScreenshot(`crear-comunidad-${scheme}.png`, {
          fullPage: true,
          mask: [page.getByText(/^v\S+ · build /)],
        })
      })
    })
  }

  test('keyboard: arrow keys move the access selection', async ({ authedPage: page, isMobile }) => {
    test.skip(isMobile, 'keyboard only')
    await mockCreate(page)
    await ready(page)
    await page.getByRole('radio', { name: /Cerrada/ }).focus()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('radio', { name: /Abierta/ })).toBeChecked()
  })

  test('the name is limited to 40 characters and the preview follows it', async ({
    authedPage: page,
  }) => {
    await mockCreate(page)
    await ready(page)
    await name(page).fill('a'.repeat(50))
    await expect(page.getByText('40/40')).toBeVisible()
    await name(page).fill('Los del paddock')
    await expect(page.getByTestId('preview-name')).toHaveText('Los del paddock')
    await expect(page.getByText('LD', { exact: true })).toBeVisible()
  })

  test('creates the community with an existing rule set and opens it', async ({
    authedPage: page,
  }) => {
    const calls = await mockCreate(page)
    await ready(page)
    await name(page).fill('Los del paddock')
    await page.getByRole('button', { name: 'Crear comunidad' }).click()
    await expect(page).toHaveURL(/\/comunidades\/300$/)
    expect(calls.rulesets).toHaveLength(0)
    expect(calls.communities).toEqual([
      { name: 'Los del paddock', description: '', open: false, default_rule_set: 7 },
    ])
  })

  test('creates a new rule set first and then the community', async ({ authedPage: page }) => {
    const calls = await mockCreate(page)
    await ready(page)
    await name(page).fill('Los del paddock')
    await page.getByRole('radio', { name: /Abierta/ }).click()
    await page.getByRole('radio', { name: /Crear unas nuevas/ }).click()
    await page.getByRole('textbox', { name: 'Nombre de las reglas' }).fill('Reglas de mi peña')
    const exact = page.getByRole('spinbutton', { name: 'Posición exacta en clasificación' })
    await exact.fill('6')
    await expect(page.getByText(/30 en clasificación, 25 en sprint y 40 en carrera/)).toBeVisible()
    await page.getByRole('button', { name: 'Crear comunidad' }).click()
    await expect(page).toHaveURL(/\/comunidades\/300$/)
    expect(calls.rulesets).toHaveLength(1)
    expect(calls.rulesets[0]).toMatchObject({ displayname: 'Reglas de mi peña', isPublic: false })
    expect(calls.communities).toEqual([
      { name: 'Los del paddock', description: '', open: true, default_rule_set: 55 },
    ])
  })

  test('touch targets are at least 44px on mobile', async ({ authedPage: page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only')
    await mockCreate(page)
    await ready(page)
    for (const target of [
      page.getByRole('radio', { name: /Abierta/ }),
      page.getByRole('button', { name: 'Crear comunidad' }),
      name(page),
    ]) {
      const box = await target.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })
})
