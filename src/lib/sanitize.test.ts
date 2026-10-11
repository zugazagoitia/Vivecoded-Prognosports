import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('removes script tags and on* attributes', () => {
    const out = sanitizeHtml(
      '<p onclick="x()">hola</p><script>alert(1)</script><img src=x onerror=alert(1)>',
    )
    expect(out).not.toMatch(/script|onclick|onerror/i)
    expect(out).toContain('hola')
  })

  it('removes javascript: URLs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/i)
  })
})
