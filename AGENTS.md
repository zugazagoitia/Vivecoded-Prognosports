# Instrucciones para agentes

Este repo es el frontend nuevo de PrognoSports. El backend y la API v2 **no** están aquí y **no se modifican** desde este proyecto (`docs/requisitos.md` §1 y §18).

## Reportar problemas del backend o del contrato de la API

El backend vive en **`Cadiducho/PrognoSports`** (privado, Issues activados). Si encuentras que la API real no coincide con la spec (`https://api.prognosports.com/openapi`, copia en `api/openapi.json`) o que el backend falla:

1. **Confírmalo contra la API real**, no solo con los mocks: los mocks (MSW, `e2e/support/api.ts`) pueden reflejar la spec y ocultar el fallo. Pruebas públicas con `curl`/`fetch` sin token; las rutas con sesión, con la cuenta de prueba (ver abajo). Para validar contra los esquemas de la app, usa `pnpm test:contract` (`docs/contract-tests.md`).
2. **Deja constancia en este repo** antes de reportar:
   - Discrepancia de contrato: añádela a `src/api/README.md` (sección «Discrepancias») y, si es verificable sin token, vigílala en `src/api/contract/corrections.contract.ts` (pasa mientras exista y falla con instrucciones cuando se corrija).
   - Workaround en el cliente: documéntalo junto al código (por qué existe y cuándo se puede quitar).
   - Crea también un issue en este repo (`bug`, más el `area:*` que corresponda) si afecta al producto.
3. **Busca duplicados** en el backend:
   ```sh
   gh issue list -R Cadiducho/PrognoSports --state all -S "<palabras clave>"
   ```
   Si existe, comenta ahí en lugar de abrir otro.
4. **Crea el issue en el backend** (en español, como los demás de ese repo). Etiquetas existentes: `bug`, `enhancement`, `api`, `server`, `database`, `frontend`, `dependencies`. Para contrato usa `bug` + `api`.
   ```sh
   gh issue create -R Cadiducho/PrognoSports --title "..." --label bug --label api --body-file <fichero.md>
   ```
   Escribe el cuerpo en un fichero (usa el directorio scratchpad, nunca el repo) y pásalo con `--body-file`.
5. **Enlaza en ambos sentidos**: cita en el issue del backend el issue/PR de este repo y deja un comentario en el de este repo con la URL del backend.

### Qué debe llevar el issue del backend

- **Resumen** y gravedad (qué rompe en el frontend).
- Por cada problema: **spec vs. API real** (ruta, campo, tipo), **evidencia** (respuesta real recortada, solo forma y valores no sensibles) y **cómo solucionarlo** (corregir el código o la spec, indicando cuál se propone y por qué).
- Cambios incompatibles: proponer un periodo de transición con ambos nombres.
- **Cómo verificar la corrección**: `pnpm api:drift` y `pnpm test:contract`.
- Agrupa los hallazgos relacionados en un solo issue con secciones numeradas, en vez de uno por campo.

Ejemplo: `Cadiducho/PrognoSports#226` (spec OpenAPI vs. respuestas reales; `verified_at` frente a `verified`).

### Reglas de seguridad

- **Nunca** pegues en un issue tokens, contraseñas, correos reales, JWT ni respuestas completas con datos personales. Redacta o muestra solo la forma (nombres de campo y tipos).
- La cuenta de prueba está en `.env.test.local` (ignorado por git; `TEST_ACCOUNT_EMAIL`, `TEST_ACCOUNT_PASSWORD`). Úsala solo para lecturas, cárgala sin imprimirla (`set -a; . ./.env.test.local; set +a`) y no la copies a ficheros versionados, logs ni issues.
- No hagas peticiones de escritura contra la API de producción salvo que el usuario lo pida expresamente.
- Reportar es una acción hacia fuera del repo: hazlo cuando el usuario lo pida o cuando el hallazgo ya esté confirmado, y dile qué has publicado y dónde.
