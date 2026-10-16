import { screen, waitFor } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { UserSchema } from '@/api/schemas'
import { MOCK_TOKEN, toWireUser } from '@/mocks/fixtures'
import { accountUser } from '@/mocks/fixtures/account'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/render'
import LandingFeatures from './LandingFeatures.vue'
import LandingHero from './LandingHero.vue'
import LandingMobileChrome from './LandingMobileChrome.vue'

const hrefs = () => screen.getAllByRole('link').map((l) => l.getAttribute('href'))

describe('LandingHero', () => {
  it('guest: register CTA, rules link and login link on desktop', async () => {
    await renderWithProviders(LandingHero)
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(hrefs()).toEqual(expect.arrayContaining(['/register', '/rules', '/login']))
  })

  it('mobile hides the "already have an account" line', async () => {
    await renderWithProviders(LandingHero, { props: { mobile: true } })
    expect(hrefs()).not.toContain('/login')
    expect(hrefs()).toContain('/register')
  })

  it('signed-in visitor goes to /home and gets no login link', async () => {
    const { pinia } = await renderWithProviders(LandingHero)
    const s = useSessionStore(pinia)
    s.token = MOCK_TOKEN
    s.user = UserSchema.parse(toWireUser(accountUser))
    await waitFor(() => expect(hrefs()).toContain('/home'))
    expect(hrefs()).not.toContain('/login')
    expect(hrefs()).not.toContain('/register')
  })
})

describe('LandingFeatures', () => {
  it.each([
    [false, 6],
    [true, 4],
  ])('mobile=%s renders %i feature cards', async (mobile, n) => {
    await renderWithProviders(LandingFeatures, { props: { mobile } })
    expect(screen.getAllByRole('listitem')).toHaveLength(n)
    expect(!!screen.queryByRole('heading', { level: 2 })).toBe(!mobile)
  })
})

describe('LandingMobileChrome', () => {
  it('header offers home, login and register', async () => {
    await renderWithProviders(LandingMobileChrome, { props: { part: 'header' } })
    expect(hrefs()).toEqual(expect.arrayContaining(['/', '/login', '/register']))
  })

  it('footer has a labelled nav with the four links', async () => {
    await renderWithProviders(LandingMobileChrome, { props: { part: 'footer' } })
    const nav = screen.getByRole('navigation')
    expect(nav.getAttribute('aria-label')).toBeTruthy()
    expect([...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/faq',
      '/rules',
      '/circuits',
      '/terms',
    ])
  })
})
