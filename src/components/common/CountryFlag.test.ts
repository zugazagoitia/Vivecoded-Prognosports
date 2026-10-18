import { screen, waitFor } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import CountryFlag from './CountryFlag.vue'

describe('CountryFlag', () => {
  it('renders the flag image with a label for a known country', async () => {
    await renderWithProviders(CountryFlag, { props: { country: 'Singapore' } })
    // The label text comes from f1Media.flag.label (Spanish, added with the shared i18n commit).
    const img = await waitFor(() => {
      const el = screen.getByRole('img')
      if (el.tagName !== 'IMG') throw new Error('flag still loading')
      return el
    })
    expect(img.getAttribute('alt')).toBeTruthy()
  })

  it('falls back to the ISO code text for a bundled code without a loaded flag', async () => {
    await renderWithProviders(CountryFlag, { props: { country: 'us' } })
    expect(await screen.findByText('US')).toBeTruthy()
  })

  it('falls back to the raw country text when the name is unknown', async () => {
    await renderWithProviders(CountryFlag, { props: { country: 'Atlantis' } })
    expect(screen.getByText('Atlantis')).toBeTruthy()
  })
})
