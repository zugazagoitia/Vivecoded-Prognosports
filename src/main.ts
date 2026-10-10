import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { EnvError, loadEnv } from './env'
import { i18n } from './i18n'
import { initObservability } from './lib/observability'
import { isEnabled } from './flags'
import { mountFlagPanel } from './flags/mount'
import { queryClient } from './queries/client'
import { createAppRouter } from './router'
import { setFlagChecker } from './router/flags'
import { installStores } from './stores'

function showFatal(message: string) {
  const el = document.getElementById('app')
  if (!el) return
  el.textContent = ''
  const pre = document.createElement('pre')
  pre.setAttribute('role', 'alert')
  pre.style.cssText = 'padding:1rem;white-space:pre-wrap;color:#b91c1c'
  pre.textContent = message
  el.append(pre)
}

async function start() {
  const env = loadEnv()
  initObservability(env, import.meta.env.MODE)
  // Dev without the real API: `VITE_API_MOCK=true pnpm dev` serves src/mocks via MSW.
  if (import.meta.env.DEV && import.meta.env.VITE_API_MOCK === 'true') {
    const { startMocking } = await import('./mocks/browser')
    await startMocking()
  }
  setFlagChecker(isEnabled)
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia).use(VueQueryPlugin, { queryClient })
  installStores(pinia) // before the router: its guards read the session provider
  app.use(i18n).use(createAppRouter()).mount('#app')
  void mountFlagPanel()
  if (import.meta.env.DEV) {
    void import('@tanstack/vue-query-devtools').then(({ VueQueryDevtools }) => {
      const host = document.createElement('div')
      document.body.append(host)
      createApp(VueQueryDevtools, { queryClient }).mount(host)
    })
  }
}

start().catch((e: unknown) => {
  const message = e instanceof EnvError ? e.message : String(e)
  console.error(`[PrognoSports] La app no puede arrancar.\n${message}`)
  showFatal(`La app no puede arrancar.\n${message}`)
})
