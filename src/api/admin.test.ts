import { http } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { ok } from '@/mocks/envelope'
import { server } from '@/mocks/server'
import { ApiError } from './errors'
import { setBaseUrl } from './client'
import { notifyGrid } from './admin'
import { gpDriversErrorMessage } from '@/queries/admin'

afterEach(() => setBaseUrl('http://api.test'))

describe('notifyGrid', () => {
  it('uses POST (the PATCH falls into grid/{driver} and answers «Piloto inválido»)', async () => {
    const methods: string[] = []
    server.use(
      http.all('*/v2/gps/1/9/3/sessions/4/grid/notification', ({ request }) => {
        methods.push(request.method)
        return ok(null)
      }),
    )
    await notifyGrid(1, 9, 3, 4)
    expect(methods).toEqual(['POST'])
  })
})

describe('gpDriversErrorMessage', () => {
  it('explains the generic backend failure of a GP with predictions', () => {
    const e = new ApiError(200, undefined, 'Error inesperado del servidor')
    expect(gpDriversErrorMessage(e)).toMatch(/pronósticos/)
  })
  it('keeps the API message otherwise', () => {
    expect(gpDriversErrorMessage(new ApiError(422, undefined, 'Piloto repetido'))).toBe(
      'Piloto repetido',
    )
  })
})
