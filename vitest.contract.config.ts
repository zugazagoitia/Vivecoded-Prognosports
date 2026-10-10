import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Live contract suite (T15): real network, GET only. Separate from `pnpm test` (which only
 * includes `*.test.ts`); run with `pnpm test:contract`. No MSW, no jsdom.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['src/api/contract/**/*.contract.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Forwarded to import.meta.env inside the tests; empty when unset.
    env: {
      CONTRACT_TEST_TOKEN: process.env.CONTRACT_TEST_TOKEN ?? '',
      CONTRACT_API_BASE_URL: process.env.CONTRACT_API_BASE_URL ?? '',
      CONTRACT_COMPETITION: process.env.CONTRACT_COMPETITION ?? '',
      CONTRACT_SEASON: process.env.CONTRACT_SEASON ?? '',
      CONTRACT_GRAND_PRIX: process.env.CONTRACT_GRAND_PRIX ?? '',
      CONTRACT_SESSION: process.env.CONTRACT_SESSION ?? '',
      CONTRACT_COMMUNITY: process.env.CONTRACT_COMMUNITY ?? '',
    },
  },
})
