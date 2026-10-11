import { readFileSync } from 'node:fs'
import { expect, test } from './support/fixtures'

// vite preview does not apply public/_headers, so the CSP the Worker would send is taken from
// dist/_headers (the `/*` block) and injected into document responses.
function cspFromHeadersFile(): string {
  const text = readFileSync('dist/_headers', 'utf8')
  const line = text.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'))
  if (!line) throw new Error('dist/_headers has no Content-Security-Policy')
  return line.slice(line.indexOf(':') + 1).trim()
}

test.describe('security', () => {
  const csp = cspFromHeadersFile()

  test('CSP forbids inline scripts, eval and framing', () => {
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toMatch(/unsafe-(inline|eval)/)
  })

  for (const path of [
    '/',
    '/login',
    '/registro',
    '/ruta-que-no-existe',
    '/home',
    '/circuits',
    '/gps',
    '/circuits/18',
    '/gps/1/10/6',
    '/gps/1/10/6/consenso/61',
    '/dev/tokens',
    '/dev/datos',
    '/dev/estados',
    '/dev/graficos',
    '/recuperar',
    '/terms',
    '/privacy',
    '/faq',
  ]) {
    test(`no CSP violations on ${path}`, async ({ authedPage: page, browserName }) => {
      test.skip(browserName !== 'chromium', 'CSP violations are checked in Chromium')
      await page.route('**/*', async (route) => {
        if (route.request().resourceType() !== 'document') return route.fallback()
        const response = await route.fetch()
        await route.fulfill({
          response,
          headers: { ...response.headers(), 'content-security-policy': csp },
        })
      })
      const problems: string[] = []
      page.on('console', (m) => {
        if (/content security policy|^CSP violation/i.test(m.text())) problems.push(m.text())
      })
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) =>
          console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`),
        )
      })
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(problems).toEqual([])
    })
  }
})
