import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { FAQ_ITEMS } from '@/content/faq'
import { renderWithProviders } from '@/test/render'
import FaqAccordion from './FaqAccordion.vue'

const items = FAQ_ITEMS.slice(0, 3)
const ids = items.map((_, i) => `q-${i}`)

describe('FaqAccordion', () => {
  it('renders one h2 button per question, all collapsed by default', async () => {
    await renderWithProviders(FaqAccordion, { props: { items, ids } })
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3)
    for (const b of screen.getAllByRole('button')) {
      expect(b.getAttribute('aria-expanded')).toBe('false')
    }
  })

  it('opens one answer at a time and lets the open one close', async () => {
    const { user } = await renderWithProviders(FaqAccordion, { props: { items, ids } })
    const [a, b] = screen.getAllByRole('button')
    await user.click(a!)
    expect(a!.getAttribute('aria-expanded')).toBe('true')
    await user.click(b!)
    expect(a!.getAttribute('aria-expanded')).toBe('false')
    expect(b!.getAttribute('aria-expanded')).toBe('true')
    await user.click(b!)
    expect(b!.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens the item given by the open model (deep link)', async () => {
    await renderWithProviders(FaqAccordion, { props: { items, ids, open: 'q-1' } })
    expect(screen.getAllByRole('button')[1]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('moves between questions with the arrow keys', async () => {
    const { user } = await renderWithProviders(FaqAccordion, { props: { items, ids } })
    screen.getAllByRole('button')[0]!.focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getAllByRole('button')[1])
  })
})
