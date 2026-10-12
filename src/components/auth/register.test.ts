import { screen, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { fail, ok } from '@/mocks/envelope'
import { MOCK_TOKEN } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import RegistroPage from '@/pages/registro.vue'
import { renderWithProviders } from '@/test/render'
import PasswordMeter from './PasswordMeter.vue'
import { passwordScore, strengthColor, strengthLabel, type StrengthScore } from './passwordStrength'
import { isEmailInvalid, registerSchema } from './registerSchema'

const LEVELS: StrengthScore[] = [0, 1, 2, 3, 4]

describe('passwordScore', () => {
  it.each([
    ['', 0],
    ['abc', 0],
    ['abcdefgh', 1],
    ['Abcdefgh', 2],
    ['Abcdefg1', 3],
    ['Abcdefg1!', 3],
    ['Abcdefgh1!', 4],
    ['Singapur2026!', 4],
  ])('%j -> %i', (pw, score) => expect(passwordScore(pw)).toBe(score))

  it('label and tone per level', () => {
    expect(LEVELS.map((s) => strengthLabel(s))).toEqual([
      'muy débil',
      'débil',
      'media',
      'buena',
      'fuerte',
    ])
    expect(LEVELS.map((s) => strengthColor(s))).toEqual(['err', 'err', 'warn', 'ok', 'ok'])
  })
})

describe('isEmailInvalid', () => {
  it.each([
    ['', false],
    ['alex@', true],
    ['a@b', true],
    ['a@b.c', false],
    ['a b@c.d', true],
  ])('%j -> %s', (v, bad) => expect(isEmailInvalid(v)).toBe(bad))
})

describe('registerSchema', () => {
  const base = { username: 'alex_ruiz', email: 'a@b.es', password: 'Abcdefg1', terms: true }
  const valid = (o: object) => registerSchema.safeParse({ ...base, ...o }).success
  it('username length 3-20 and allowed characters', () => {
    expect(valid({ username: 'ab' })).toBe(false)
    expect(valid({ username: 'a'.repeat(21) })).toBe(false)
    expect(valid({ username: 'abc' })).toBe(true)
    expect(valid({ username: 'a'.repeat(20) })).toBe(true)
    expect(valid({ username: 'a b' })).toBe(false)
  })
  it('requires terms, a valid email and 8+ password characters', () => {
    expect(valid({ terms: false })).toBe(false)
    expect(valid({ email: 'alex@' })).toBe(false)
    expect(valid({ password: 'Abcdef1' })).toBe(false)
    expect(valid({})).toBe(true)
  })
})

describe('PasswordMeter', () => {
  it('announces the level as text and fills the segments', async () => {
    const view = await renderWithProviders(PasswordMeter, { props: { password: 'abc' } })
    expect(screen.getByRole('status').textContent).toContain('Seguridad: muy débil')
    await view.rerender({ password: 'Abcdefg1' })
    expect(screen.getByRole('status').textContent).toContain('buena')
    expect(screen.getByTestId('password-meter').dataset.score).toBe('3')
    const filled = screen.getAllByTestId('meter-seg').filter((s) => s.className.includes('bg-ok'))
    expect(filled).toHaveLength(3)
  })
})

const routes = [
  { path: '/registro', component: RegistroPage },
  { path: '/verificar', component: { render: () => null } },
  { path: '/:path(.*)*', component: { render: () => null } },
]

type Rendered = Awaited<ReturnType<typeof renderWithProviders>>

async function fill(
  user: Rendered['user'],
  v: { u?: string; e?: string; p?: string; terms?: boolean },
) {
  if (v.u) await user.type(screen.getByLabelText('Nombre de usuario'), v.u)
  if (v.e) await user.type(screen.getByLabelText('Correo electrónico'), v.e)
  if (v.p) await user.type(screen.getByLabelText('Contraseña'), v.p)
  if (v.terms) await user.click(screen.getByRole('checkbox'))
}

describe('registro page', () => {
  it('validates the email live and clears the error when emptied', async () => {
    const { user } = await renderWithProviders(RegistroPage, { route: '/registro', routes })
    const email = screen.getByLabelText('Correo electrónico')
    await user.type(email, 'alex@')
    expect(screen.getByText('Escribe un correo válido.')).toBeTruthy()
    expect(email.getAttribute('aria-invalid')).toBe('true')
    await user.clear(email)
    expect(screen.queryByText('Escribe un correo válido.')).toBeNull()
  })

  it('does not submit an invalid form, shows errors and focuses the first one', async () => {
    let calls = 0
    server.use(
      http.post('*/v2/auth/register', () => {
        calls++
        return ok(null)
      }),
    )
    const { user } = await renderWithProviders(RegistroPage, {
      route: '/registro',
      routes,
      render: { container: document.body.appendChild(document.createElement('div')) },
    })
    await user.click(screen.getByRole('button', { name: 'Registrarse' }))
    expect(await screen.findByText('Escribe un nombre de usuario.')).toBeTruthy()
    expect(
      screen.getByText('Debes aceptar los términos y la política de privacidad para registrarte.'),
    ).toBeTruthy()
    expect(calls).toBe(0)
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('Nombre de usuario')),
    )
  })

  it('registers, signs in and goes to /verificar keeping a sanitised redirect', async () => {
    let body: unknown
    server.use(
      http.post('*/v2/auth/register', async ({ request }) => {
        body = await request.json()
        return ok('x')
      }),
      http.post('*/v2/auth/login', () => ok(MOCK_TOKEN)),
    )
    const { user, router } = await renderWithProviders(RegistroPage, {
      route: '/registro?redirect=/comunidades',
      routes,
    })
    await fill(user, { u: 'piloto1', e: 'piloto1@example.com', p: 'Abcdefg1', terms: true })
    await user.click(screen.getByRole('button', { name: 'Registrarse' }))
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/verificar'))
    expect(router.currentRoute.value.query.redirect).toBe('/comunidades')
    expect(body).toEqual({
      username: 'piloto1',
      email: 'piloto1@example.com',
      password: 'Abcdefg1',
    })
  })

  it('shows a duplicated username under its field', async () => {
    server.use(http.post('*/v2/auth/register', () => fail(400, 'Username in use')))
    const { user, router } = await renderWithProviders(RegistroPage, {
      route: '/registro',
      routes,
    })
    await fill(user, { u: 'piloto1', e: 'a@b.es', p: 'Abcdefg1', terms: true })
    await user.click(screen.getByRole('button', { name: 'Registrarse' }))
    expect(await screen.findByText('Ese nombre de usuario no está disponible.')).toBeTruthy()
    expect(router.currentRoute.value.path).toBe('/registro')
  })

  it('shows a duplicated email under its field', async () => {
    server.use(
      http.post('*/v2/auth/register', () =>
        HttpResponse.json(
          { success: false, status: 400, code: 400, message: 'El correo ya está registrado' },
          { status: 400 },
        ),
      ),
    )
    const { user } = await renderWithProviders(RegistroPage, { route: '/registro', routes })
    await fill(user, { u: 'piloto1', e: 'a@b.es', p: 'Abcdefg1', terms: true })
    await user.click(screen.getByRole('button', { name: 'Registrarse' }))
    expect(await screen.findByText('Ya existe una cuenta con ese correo.')).toBeTruthy()
  })

  it('legal links open in a new tab safely; login link keeps redirect', async () => {
    await renderWithProviders(RegistroPage, { route: '/registro?redirect=/home', routes })
    for (const name of [/términos de uso/, /política de privacidad/]) {
      const a = screen.getByRole('link', { name })
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener noreferrer')
    }
    expect(screen.getByRole('link', { name: 'Inicia sesión' }).getAttribute('href')).toBe(
      '/login?redirect=/home',
    )
  })

  it('has autocomplete hints', async () => {
    await renderWithProviders(RegistroPage, { route: '/registro', routes })
    expect(screen.getByLabelText('Nombre de usuario').getAttribute('autocomplete')).toBe('username')
    expect(screen.getByLabelText('Correo electrónico').getAttribute('autocomplete')).toBe('email')
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe('new-password')
  })
})
