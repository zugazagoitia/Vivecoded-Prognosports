import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import pkg from './package.json' with { type: 'json' }

/** Runs a git command; returns undefined when git or the repo is unavailable. */
function git(args: string): string | undefined {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || undefined
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

  return {
    // VueRouter() must come before vue(). File-based routes live in src/pages (see src/router).
    plugins: [
      VueRouter({ routesFolder: 'src/pages', dts: 'src/typed-router.d.ts' }),
      vue(),
apiOriginPlugin(env.VITE_API_BASE_URL)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    define: {
      'import.meta.env.VITE_GIT_SHA': JSON.stringify(gitSha),
      'import.meta.env.VITE_GIT_DATE': JSON.stringify(gitDate),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
  }
})
