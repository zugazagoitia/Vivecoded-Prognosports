import { createApp } from 'vue'
import App from './App.vue'
import { EnvError, loadEnv } from './env'
import { i18n } from './i18n'
import { createAppRouter } from './router'

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
  loadEnv()
  // Dev without the real API: `VITE_API_MOCK=true pnpm dev` serves src/mocks via MSW.
  if (import.meta.env.DEV && import.meta.env.VITE_API_MOCK === 'true') {
    const { startMocking } = await import('./mocks/browser')
    await startMocking()
  }
  createApp(App).use(i18n).use(createAppRouter()).mount('#app')
}

start().catch((e: unknown) => {
  const message = e instanceof EnvError ? e.message : String(e)
  console.error(`[PrognoSports] La app no puede arrancar.\n${message}`)
  showFatal(`La app no puede arrancar.\n${message}`)
})
