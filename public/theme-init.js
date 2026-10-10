// Pre-paint theme (F1). Loaded synchronously from <head> (same-origin, CSP script-src 'self'),
// so <html> has the right class before the first paint. Keep in sync with src/stores/theme.ts.
;(function () {
  var mode = null
  try {
    mode = localStorage.getItem('prognosports:theme')
  } catch (e) {
    // Storage blocked: fall back to the system preference.
  }
  var dark =
    mode === 'dark' ||
    (mode !== 'light' && !!window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)
  var root = document.documentElement
  root.classList.toggle('dark', dark)
  root.dataset.theme = dark ? 'dark' : 'light'
})()
