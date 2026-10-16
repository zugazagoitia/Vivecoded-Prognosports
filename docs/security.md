# Seguridad del frontend

Referencias: `docs/requisitos.md` §22.6, §23, §24.8.

## Cabeceras

Se sirven desde `public/_headers` (bloque `/*`; Vite lo copia a `dist/_headers`). Verificado con `wrangler dev` que Workers Static Assets las aplica a `/`, a rutas profundas (fallback SPA) y a assets. `scripts/smoke-deploy.sh <url>` las comprueba tras cada despliegue.

| Cabecera                    | Valor                                                 |
| --------------------------- | ----------------------------------------------------- |
| Content-Security-Policy     | ver abajo                                             |
| Strict-Transport-Security   | `max-age=31536000; includeSubDomains` (sin `preload`) |
| X-Content-Type-Options      | `nosniff`                                             |
| Referrer-Policy             | `strict-origin-when-cross-origin`                     |
| Permissions-Policy          | cámara, micrófono, geolocalización, pago y USB `()`   |
| Cross-Origin-Opener-Policy  | `same-origin`                                         |
| X-Frame-Options             | `DENY` (refuerzo de `frame-ancestors` en navegadores antiguos) |

### CSP

`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https://api.prognosports.com https://*.basemaps.cartocdn.com; connect-src 'self' https://api.prognosports.com; font-src 'self'; worker-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`

- Sin `unsafe-inline` ni `unsafe-eval`. Vite emite el JS y el CSS como ficheros; no hay scripts en línea. `style-src 'self'` basta: los gráficos son SVG propios (no hay ECharts ni MapLibre).
- Zod comprueba `new Function('')` para su JIT y eso se reporta como violación `script-src eval` aunque se capture; `src/lib/zod-csp.ts` fija `z.config({ jitless: true })` y se importa primero en `main.ts`.
- Fuentes: el sistema de diseño usa la pila del sistema en la app (los `preview.html` de `docs/design` cargan Inter de Google Fonts solo como maqueta). Si se adopta Inter, autoalojarla (`@fontsource`, `font-src 'self'`) en lugar de abrir Google Fonts.
- **API**: el origen está fijado a `https://api.prognosports.com` en `public/_headers`. Si la API de otro entorno usa otro origen (`VITE_API_BASE_URL`), hay que editar `img-src`/`connect-src` en ese despliegue.
- **Servicios opcionales (hoy inactivos; al activarlos hay que ampliar la CSP en la misma línea de `_headers`)**:
  - Sentry (se activa con `VITE_SENTRY_DSN`): su origen de ingest (p. ej. `https://*.ingest.sentry.io`) en `connect-src`.
  - Cloudflare Web Analytics (`VITE_CF_ANALYTICS_TOKEN`): `https://static.cloudflareinsights.com` en `script-src` y `https://cloudflareinsights.com` en `connect-src`.
  - Mapa (circuito, P4): resuelto sin MapLibre. `CircuitMap.vue` pinta teselas raster de CARTO (`https://{a-d}.basemaps.cartocdn.com/{light_all|dark_all}/z/x/y[@2x].png`) como `<img>`, así que solo hace falta `https://*.basemaps.cartocdn.com` en `img-src`. No necesita `connect-src`, `worker-src blob:` ni `style-src 'unsafe-inline'` (la posición de las teselas se fija por CSSOM). Atribución «© OpenStreetMap contributors © CARTO» siempre visible.
- El e2e (`e2e/security.spec.ts`) inyecta la CSP de `dist/_headers` en los documentos servidos por `vite preview` y falla ante cualquier `securitypolicyviolation` en login, 404 e inicio (Chromium). Cubre además comunidades, calendario, circuito, GP (detalle, pronosticar, consenso, resultados, simulador) y las páginas legales y de ayuda. Pendiente de añadir: Ranking, Perfil y Admin.

## Política del token de sesión (§23.3)

Mientras la API no ofrezca cookies `httpOnly`, el token vive en `localStorage` (`prognosports:token`) o, si en el login se desmarca «Mantener la sesión», en `sessionStorage` (ver `src/stores/storage.ts`). Riesgo: cualquier XSS puede leerlo. Mitigaciones:

1. CSP estricta (arriba): bloquea scripts en línea/externos y `eval`.
2. `v-html` prohibido por lint (`vue/no-v-html: error`); solo con comentario de excepción y HTML pasado por `sanitizeHtml()` (`src/lib/sanitize.ts`, DOMPurify; test: elimina `<script>`, `on*` y `javascript:`).
3. Los textos de usuario (bio, nombres) se renderizan con interpolación `{{ }}`, que escapa.
4. Logout borra el token local siempre y llama a `DELETE /v2/auth/logout` para revocarlo (`session.logout`); un 401 limpia la sesión.
5. Enlaces externos con `rel="noopener noreferrer"` (no hay ninguno hoy; regla a respetar al añadirlos).
6. El build no contiene secretos: `pnpm check:dist` (`scripts/check-dist-secrets.sh`) falla si `dist/` contiene patrones de token (`CLOUDFLARE_*`, claves privadas, tokens de Sentry/GitHub/AWS). Ejecútalo tras `pnpm build` antes de subir cambios que toquen el build.

Objetivo a medio plazo: pedir al backend cookies `httpOnly; Secure; SameSite=Lax` y eliminar `localStorage`.

## Datos sensibles (§24.8)

`hashedPassword` se descarta al parsear `User` (`src/api/schemas.ts`, `sanitizeUser`), por lo que ninguna vista puede renderizarlo.

### Hallazgos para backend

- El esquema OpenAPI de `User` (`src/api/schema.d.ts`) declara `hashedPassword?: string`, es decir, la API puede devolver el hash en respuestas de usuario. Debe dejar de serializarse en el servidor; el frontend solo lo descarta como defensa en profundidad. No se toca la API desde este repositorio; el hallazgo se reporta al backend (ver `src/api/README.md`).

## Criterios de la issue y estado

- Cabeceras A o superior en securityheaders.com: no verificable sin la beta desplegada; la configuración cubre CSP, HSTS, nosniff, Referrer-Policy y Permissions-Policy. (Posible matiz: HSTS lo envía también `workers.dev`.)
- Sin violaciones de CSP: cubierto por `e2e/security.spec.ts` en las rutas públicas y de comunidad/GP (lista en el propio spec). Ranking, Perfil y Admin: pendientes de añadir al spec.
- Inyección de `<script>` en la bio: se muestra como texto por interpolación; `sanitizeHtml` cubierto con test unitario. La pantalla de perfil ya existe, pero aún no hay un e2e específico de inyección en la bio.
