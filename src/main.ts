import { createApp } from 'vue'
import App from './App.vue'
import { EnvError, loadEnv } from './env'

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
  createApp(App).mount('#app')
} catch (e) {
  const message = e instanceof EnvError ? e.message : String(e)
  console.error(`[PrognoSports] La app no puede arrancar.\n${message}`)
  showFatal(`La app no puede arrancar.\n${message}`)
}
