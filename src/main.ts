import { createApp } from 'vue'
import App from './App.vue'
import { EnvError, loadEnv } from './env'
import { i18n } from './i18n'
import { isEnabled } from './flags'
import { mountFlagPanel } from './flags/mount'
import { createAppRouter } from './router'
import { setFlagChecker } from './router/flags'

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

try {
  loadEnv()
  setFlagChecker(isEnabled)
  createApp(App).use(i18n).use(createAppRouter()).mount('#app')
  void mountFlagPanel()
} catch (e) {
  const message = e instanceof EnvError ? e.message : String(e)
  console.error(`[PrognoSports] La app no puede arrancar.\n${message}`)
  showFatal(`La app no puede arrancar.\n${message}`)
}
