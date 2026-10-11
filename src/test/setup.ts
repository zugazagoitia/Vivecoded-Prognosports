import { cleanup, configure } from '@testing-library/vue'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/server'

// CI runs with coverage on shared runners: the 1 s default of findBy*/waitFor is too tight.
configure({ asyncUtilTimeout: 5000 })

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
