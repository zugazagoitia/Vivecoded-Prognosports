# Documentación

Índice de la documentación de PrognoSports (frontend). Para arrancar el proyecto, empieza por el [`README.md`](../README.md) de la raíz; las reglas de trabajo para agentes y personas están en [`AGENTS.md`](../AGENTS.md).

## Guías operativas

| Documento                                 | Contenido                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`testing.md`](testing.md)                | Pruebas unitarias, e2e (Playwright, capturas en Linux, axe), cobertura y convenciones de fixtures.      |
| [`ci.md`](ci.md)                          | Workflows, `ci-ok`, e2e dentro de CI, coverage, CodeQL, Dependabot, rama `develop -> master`.           |
| [`deploy.md`](deploy.md)                  | Cloudflare Workers, entornos, secretos, rollback, Sentry/analítica y presupuesto de bundle.             |
| [`security.md`](security.md)              | Cabeceras y CSP, política del token de sesión, datos sensibles.                                         |
| [`local-backend.md`](local-backend.md)    | Cómo usar un backend local sin secretos del proyecto.                                                   |
| [`feature-flags.md`](feature-flags.md)    | Los 12 flags `VITE_FF_*`, valores por entorno y panel de revisión.                                       |
| [`contract-tests.md`](contract-tests.md)  | `pnpm api:drift` y `pnpm test:contract` contra la API real.                                             |

## Contrato con la API

| Documento                                  | Contenido                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| [`../src/api/README.md`](../src/api/README.md) | Cliente, discrepancias entre la spec y la API real, estado de los reportes al backend.             |
| `../api/openapi.json`                      | Copia versionada de la spec (`https://api.prognosports.com/openapi`); `pnpm api:drift` la compara.     |

## Requisitos y diseño

| Documento                                                                | Contenido                                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [`requisitos.md`](requisitos.md)                                         | Requisitos y decisiones técnicas (documento de planificación inicial, con aviso de estado). |
| [`design/issues/a-confirmar.md`](design/issues/a-confirmar.md)           | Puntos «a confirmar» de las issues de diseño y **decisiones de producto tomadas** (resumen al inicio). |
| [`design/issues/issues/`](design/issues/issues/)                         | Especificación de cada pantalla/pieza (`<código>.md`).                            |
| [`design/issues/HANDOVER.md`](design/issues/HANDOVER.md)                 | Histórico: cómo se crearon las issues.                                            |
| [`design/mockup/`](design/mockup/README.md)                              | Mockup (canvas) de referencia visual; ver su README para la sintaxis propia.       |
| [`design/design-system/`](design/design-system/README.md)                | Sistema de diseño (tokens, componentes, assets).                                  |

## Convenciones

- Documentación y mensajes de UI en **español**; identificadores de código en inglés.
- Cada afirmación operativa (comando, ruta, workflow) debe existir de verdad: si cambias un script, un workflow o un fichero, actualiza el documento que lo cita (`grep -rn "<nombre>" README.md AGENTS.md docs src/api/README.md`).
- Los enlaces entre documentos son relativos; comprueba que no se rompen antes de abrir el PR.
