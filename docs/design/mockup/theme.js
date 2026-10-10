/* Interruptor global claro/oscuro: data-theme + .dark en <html>; sincronizado entre pantallas. */
(function () {
  var KEY = 'pg-theme', root = document.documentElement, bc = null;
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(t) { try { localStorage.setItem(KEY, t); } catch (e) {} }
  function apply(t) {
    if (t !== 'dark' && t !== 'light') return;
    root.setAttribute('data-theme', t);
    root.classList.toggle('dark', t === 'dark');
    try { window.dispatchEvent(new CustomEvent('pg-theme', { detail: t })); } catch (e) {}
  }
  function current() {
    var a = root.getAttribute('data-theme');
    if (a === 'dark' || a === 'light') return a;
    if (root.classList.contains('dark')) return 'dark';
    try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  try { bc = new BroadcastChannel('pg-theme'); bc.onmessage = function (e) { apply(e.data); }; } catch (e) {}
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(e.newValue); });
  apply(read());
  window.pgTheme = current;
  window.pgToggleTheme = function () {
    var n = current() === 'dark' ? 'light' : 'dark';
    apply(n); write(n);
    try { if (bc) bc.postMessage(n); } catch (e) {}
    return n;
  };
})();
