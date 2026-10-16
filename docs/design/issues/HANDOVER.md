> **Documento histórico (completado).** Las 89 issues (9 épicas + 80 issues) ya se crearon y casi todas están implementadas; el mapa código → número está en `issue-map.json`. Se conserva como referencia del método. Estado actual del proyecto: [`README.md`](../../../README.md) y [`docs/README.md`](../../README.md). Decisiones tomadas sobre los «a confirmar»: [`a-confirmar.md`](a-confirmar.md).

# Handover: crear las issues de GitHub

Objetivo: crear en `zugazagoitia/Vivecoded-Prognosports` 89 issues (9 épicas + 80 issues) a partir de este directorio, con `gh`. Ya se hizo el diseño, el plan y la redacción; falta solo crearlas.

## Contenido
- `manifest.json`: épicas (`epics`) e issues (`issues`). Cada issue tiene `code`, `title`, `deps` (códigos), `size`, `labels`, `epic` (código de épica), `kind` (`technical|foundation|piece|screen`), `body` (ruta a su `.md`, o `null`).
- `issues/<código>.md`: cuerpo ya redactado de las 55 issues de pantalla (G3, R1, M9…). Empieza con `<!-- design-issue: <archivo> -->`.
- Mockup: `docs/design/mockup/` (ver su README). Requisitos: `docs/requisitos.md`. Sistema de diseño: `docs/design/design-system/`.

## Reglas
- No toques los repos `PrognoSports` ni `PrognoSports-frontend` (solo referencia). La API v2 no cambia. No hagas push del mockup: lo hace el usuario.
- Título de cada issue: `[<código>] <title>`. Épicas: `[Épica] <title>`.
- Crea antes las etiquetas que falten (`gh label create`): `design`, `technical`, `blocked`, `feature-flag`, `mobile`, `type:screen|foundation|component|epic`, `size:S|M|L`, `area:*`.
- Antes de crear, busca duplicados con el marcador `design-issue` o el título.
- Idempotente: si una issue ya existe, no la dupliques; guarda el mapa código → número en `issue-map.json`.

## Pasos
1. Crea las 9 épicas (cuerpo: objetivo, lista de tareas vacía que rellenarás, bloque «⚠️ a confirmar»). Etiqueta `type:epic`.
2. **Piloto**: crea solo **G3** y enseña el enlace al usuario; espera su visto bueno. Si pide cambios, ajusta el formato y repite con G3 antes de seguir.
3. Crea el resto en bloques. Cuerpo = `issues/<código>.md` para pantallas.
   - Para T1–T15, F1–F6 y N1–N4 (`body: null`) redacta tú el cuerpo en el mismo formato (Objetivo, Alcance, Dependencias, Criterios de aceptación, Tests, ⚠️ a confirmar):
     - T*: de `docs/requisitos.md` §19 (stack), §20 (tests), §21 (CI), §22 (Cloudflare), §23 (seguridad), §25 (API).
     - F*/N*: de `docs/design/design-system/` y los tableros guía del mockup (Fundamentos, Componentes, Navegación, Gráficos, Estados, Flags) y las piezas AppNav, SiteFooter, TabBar, MobileBar, AdminSide, RankNav.
4. Sustituye en cada cuerpo la lista «Dependencias» (códigos) por `#número`, añadiendo «Bloqueada por #N» cuando sea necesario.
5. Enlaza cada issue como sub-issue de su épica (`epic` del manifest) y actualiza la lista de tareas de cada épica.
6. Revisa cada issue como si fueras quien la implementa sin ver el canvas: ¿le falta algo para empezar? Corrige.
7. Resumen final: nº de issues por tipo, enlace a la épica raíz y lista agrupada de «⚠️ a confirmar» para decidir con el usuario.

## Casos especiales
- **U4 Notificaciones**: bloqueada (la API v2 no tiene histórico ni leído/no leído). Etiqueta `blocked`; el cuerpo ya lo explica.
- **Pantallas con flag** (R3–R13, y bloques en H1/H2/H5): off por defecto en producción, código con carga diferida, rutas/enlaces/peticiones ocultos.
- Bugs del mockup a no copiar (ya anotados en los cuerpos): «1 jugadores», «−0», tooltips en `title`, falta de `aria-pressed`, objetivos táctiles < 44 px, columnas `.side-l` en línea, falta de vista de tabla en R10/R12/R13.
- Decisiones de producto sin cerrar (consúltalas al usuario, no las inventes): redacción del bonus («más aciertos» vs «más puntos»), contradicciones de H2 y H4, y endpoints inexistentes (U4, M3 edición, M4 equipo por GP, M12 envío manual, M13 recálculo, «quién ha pronosticado» en H1/H5, resolución de códigos de invitación en H2/H7).
