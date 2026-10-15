import { screen, waitFor, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { LEGAL, LEGAL_TAB_ORDER } from '@/content/legal'
import { renderWithProviders } from '@/test/render'
import LegalPage from './LegalPage.vue'

describe('LegalPage', () => {
  it.each(LEGAL_TAB_ORDER.map((t) => [t]))(
    '%s: title, draft warning, TOC and sections',
    async (tab) => {
      await renderWithProviders(LegalPage, { props: { tab } })
      const doc = LEGAL[tab]
      expect(screen.getByRole('heading', { level: 1, name: doc.title })).toBeTruthy()
      expect(screen.getByTestId('legal-draft')).toBeTruthy()
      const toc = screen.getByRole('navigation', { name: 'En esta página' })
      expect(within(toc).getAllByRole('link')).toHaveLength(doc.sections.length)
      for (const s of doc.sections) expect(document.getElementById(s.id)?.tagName).toBe('H2')
    },
  )

  it('shows the placeholder date while the update date is pending', async () => {
    await renderWithProviders(LegalPage, { props: { tab: 'terms' } })
    expect(document.querySelector('.ph')?.textContent).toBe('[FECHA]')
  })

  it('selecting another tab navigates to its own URL', async () => {
    const { user, router } = await renderWithProviders(LegalPage, { props: { tab: 'terms' } })
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(LEGAL_TAB_ORDER.length)
    await user.click(tabs[1]!)
    await waitFor(() => expect(router.currentRoute.value.path).toBe(`/${LEGAL_TAB_ORDER[1]}`))
  })
})
