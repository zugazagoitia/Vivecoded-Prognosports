import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { gpsApi } from '@/api/index'
import { setBaseUrl, setTokenProvider } from '../client'
import { ContractMismatchError, NetworkUnavailableError, live } from './harness'

afterEach(() => {
  setTokenProvider(() => null)
  setBaseUrl('http://api.test')
})

describe('contract harness', () => {
  it('names the schema and the field when a required field disappears from the API', async () => {
    setBaseUrl('http://api.test')
    // Simulates the API dropping the required `id` from GrandPrix.
    server.use(
      http.get('*/v2/gps', () =>
        HttpResponse.json({
          success: true,
          result: [{ name: 'Australian Grand Prix', code: 'AUS' }],
        }),
      ),
    )
    const run = live('GrandPrixSchema[] GET /v2/gps', () => gpsApi.listAllGps())
    await expect(run).rejects.toBeInstanceOf(ContractMismatchError)
    await expect(run).rejects.toThrow(/GrandPrixSchema\[\] GET \/v2\/gps/)
    await expect(run).rejects.toThrow(/field "0\.id"/)
  })

  it('does not confuse a persistent 5xx with a contract change', async () => {
    setBaseUrl('http://api.test')
    server.use(http.get('*/v2/gps', () => new HttpResponse('boom', { status: 503 })))
    await expect(live('gps', () => gpsApi.listAllGps(), 2)).rejects.toBeInstanceOf(
      NetworkUnavailableError,
    )
  })

  it('does not retry client errors', async () => {
    setBaseUrl('http://api.test')
    let calls = 0
    server.use(
      http.get('*/v2/gps', () => {
        calls++
        return new HttpResponse('nope', { status: 404 })
      }),
    )
    await expect(live('gps', () => gpsApi.listAllGps())).rejects.toMatchObject({ status: 404 })
    expect(calls).toBe(1)
  })
})
