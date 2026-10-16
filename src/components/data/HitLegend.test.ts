import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import HitLegend from './HitLegend.vue'

describe('HitLegend', () => {
  it('explains the four hit kinds in text, hiding the sample cells from AT', async () => {
    const { container } = await renderWithProviders(HitLegend)
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(4)
    expect(container.querySelector('.sr-only')?.textContent).toMatch(/:$/)
    expect((container.textContent ?? '').length).toBeGreaterThan(20)
  })
})
