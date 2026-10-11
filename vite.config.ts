import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'
import VueRouter from 'vue-router/vite'
import { loadEnv, type Plugin } from 'vite'
import { coverageConfigDefaults, defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }

/** Runs a git command; returns undefined when git or the repo is unavailable. */
function git(args: string): string | undefined {
  try {
    return (
      execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim() || undefined
    )
  } catch {
    return undefined
  }
}

/** Replaces %VITE_API_ORIGIN% in index.html with the origin of VITE_API_BASE_URL (preconnect). */
function apiOriginPlugin(apiBaseUrl: string | undefined): Plugin {
  let origin = ''
  try {
    if (apiBaseUrl) origin = new URL(apiBaseUrl).origin
  } catch {
    // Invalid URL: the runtime Zod validation reports it with a clear message.
  }
  return {
    name: 'prognosports:api-origin',
    transformIndexHtml: (html) =>
      origin
        ? html.replace('%VITE_API_ORIGIN%', origin)
        : html.replace(/\s*<link rel="preconnect" href="%VITE_API_ORIGIN%"[^>]*>/, ''),
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // CI passes VITE_GIT_* (see T11); otherwise they are computed from git.
  const gitSha = env.VITE_GIT_SHA || git('rev-parse --short HEAD') || 'unknown'
  const gitDate = env.VITE_GIT_DATE || git('log -1 --format=%cI') || new Date().toISOString()
  const appVersion = env.VITE_APP_VERSION || pkg.version

  // Source maps exist only when CI can upload them to Sentry; they are deleted from dist/ afterwards.
  const sentryToken = process.env.SENTRY_AUTH_TOKEN || undefined
  const withSentry = sentryToken !== undefined

  return {
    // VueRouter() must come before vue(). File-based routes live in src/pages (see src/router).
    plugins: [
      VueRouter({ routesFolder: 'src/pages', dts: 'src/typed-router.d.ts' }),
      vue(),
      tailwindcss(),
      apiOriginPlugin(env.VITE_API_BASE_URL),
      // Source maps to Sentry (CI only, needs SENTRY_AUTH_TOKEN/ORG/PROJECT). Maps never ship in dist/.
      withSentry &&
        sentryVitePlugin({
          authToken: sentryToken,
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          telemetry: false,
          release: { name: gitSha },
          sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
        }),
      // Bundle report: `ANALYZE=true vite build` -> reports/bundle.html (CI artifact).
      process.env.ANALYZE === 'true' &&
        visualizer({ filename: 'reports/bundle.html', gzipSize: true, brotliSize: true }),
    ],
    build: {
      sourcemap: withSentry ? 'hidden' : false,
      rollupOptions: {
        output: {
          // Zod and its CSP config (src/lib/zod-csp.ts) must evaluate together: schemas built at
          // module scope elsewhere would otherwise probe `new Function` before `jitless` is set (T13).
          manualChunks(id: string) {
            if (id.includes('/node_modules/zod/') || id.endsWith('/src/lib/zod-csp.ts'))
              return 'zod'
            return undefined
          },
        },
      },
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
      environment: 'jsdom',
      testTimeout: 15000,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
      env: { VITE_API_BASE_URL: 'http://api.test', VITE_API_MOCK: 'false' },
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        // Only domain logic is gated (requisitos §20.2): utils, i18n helpers, api core, env, domain.
        // Endpoint wrappers (src/api/<area>.ts) are thin and covered by the T4 query tests.
        include: [
          'src/domain/**/*.ts',
          'src/utils/**/*.ts',
          'src/i18n/**/*.ts',
          'src/api/{client,errors,events,config}.ts',
          'src/env.ts',
        ],
        exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts', '**/*.test.ts'],
        thresholds: { lines: 90, statements: 90, functions: 90, branches: 85 },
      },
    },
    define: {
      'import.meta.env.VITE_GIT_SHA': JSON.stringify(gitSha),
      'import.meta.env.VITE_GIT_DATE': JSON.stringify(gitDate),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
  }
})
