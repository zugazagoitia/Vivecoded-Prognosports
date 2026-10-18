import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/vue'
import { renderWithProviders } from '@/test/render'
import { setFlagOverride } from '@/flags'
import TeamBadge from './TeamBadge.vue'

describe('TeamBadge', () => {
  beforeEach(() => setFlagOverride('F1_TEAM_LOGOS', false))
  afterEach(() => setFlagOverride('F1_TEAM_LOGOS', false))

  it('renders the own badge with the abbreviation when the logo flag is off', async () => {
    await renderWithProviders(TeamBadge, {
      props: { name: 'Red Bull Racing', teamcolor: '3671C6' },
    })
    const badge = screen.getByRole('img', { name: 'Red Bull Racing' })
    expect(badge.textContent).toBe('RBR')
  })

  it('renders the F1 logo when the flag is on', async () => {
    setFlagOverride('F1_TEAM_LOGOS', true)
    await renderWithProviders(TeamBadge, { props: { name: 'McLaren', teamcolor: '#FF8000' } })
    const img = screen.getByRole('img', { name: 'McLaren' })
    expect(img.tagName).toBe('IMG')
    expect(img.getAttribute('src')).toMatch(/mclaren-logo\.png$/)
  })

  it('falls back to the own badge when the logo fails to load', async () => {
    setFlagOverride('F1_TEAM_LOGOS', true)
    await renderWithProviders(TeamBadge, { props: { name: 'Ferrari', teamcolor: 'dc0000' } })
    await fireEvent.error(screen.getByRole('img', { name: 'Ferrari' }))
    const badge = await screen.findByRole('img', { name: 'Ferrari' })
    expect(badge.tagName).toBe('SPAN')
    expect(badge.textContent).toBe('FER')
  })
})
