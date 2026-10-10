# Mockup del rediseño (canvas)

Copia local del canvas "PrognoSports · Rediseño". Es la referencia visual de las issues `design`.

## Archivos

| Archivo | Qué es |
|---|---|
| `*.dc.html` | Una pantalla o pieza del canvas. Cada una es un tablero (escritorio 1440 px, móvil 390 px). |
| `pg.css` | Estilos compartidos y tokens del canvas. |
| `seed.js` | Datos de ejemplo. **Ficticios**: no salen de la API. |
| `theme.js` | Cambio de tema claro/oscuro del canvas. |
| `canvas.json` | Páginas, tableros y notas de revisión del canvas. |

## Sintaxis propia del canvas

`<x-dc>`, `renderVals()`, `{{var}}`, `sc-for`, `sc-if` y `dc-import` son sintaxis del canvas, no de Vue. Sirven para leer estructura, textos, clases y estilos; hay que reescribirlos como componentes Vue. No copies el código tal cual.

## Código → archivo

Cada issue de pantalla enlaza su archivo. Tabla de referencia:

| Código | Archivo | Pantalla |
|---|---|---|
| P1 | `Landing.dc.html` | Landing |
| P2 | `Reglas.dc.html` | Cómo se puntúa |
| P3 | `Circuitos.dc.html` | Circuitos |
| P4 | `CircuitoDetalle.dc.html` | Detalle de circuito |
| P5 | `FAQ.dc.html` | Preguntas frecuentes |
| P6 | `Legal.dc.html` | Términos y privacidad |
| A1 | `Login.dc.html` | Iniciar sesión |
| A2 | `Registro.dc.html` | Registro |
| A3 | `Recuperar.dc.html` | Recuperar contraseña |
| A4 | `Restablecer.dc.html` | Nueva contraseña |
| A5 | `Verificar.dc.html` | Verificación de correo |
| H1 | `Inicio.dc.html` | Inicio |
| H2 | `Comunidades.dc.html` | Mis comunidades |
| H3 | `Explorar.dc.html` | Explorar comunidades |
| H4 | `CrearComunidad.dc.html` | Crear comunidad |
| H5 | `ComunidadHome.dc.html` | Comunidad |
| H6 | `ComunidadAjustes.dc.html` | Ajustes de la comunidad |
| H7 | `Invitacion.dc.html` | Invitación |
| G1 | `GPLista.dc.html` | Grandes Premios (calendario) |
| G2 | `GPDetalle.dc.html` | Fin de semana de carrera |
| G3 | `Pronosticar.dc.html` | Pronosticar |
| G4 | `ParrillaComunidad.dc.html` | Parrilla y consenso |
| G5 | `Resultados.dc.html` | Resultados y puntos |
| G6 | `Simulador.dc.html` | Simulador de puntos |
| R0 | `RankingResumen.dc.html` | Resumen del ranking |
| R1 | `Clasificacion.dc.html` | Clasificación |
| R2 | `Matriz.dc.html` | Puntos por Gran Premio (matriz) |
| R3 | `MiTemporada.dc.html` | Mi temporada |
| R4 | `Palmares.dc.html` | Palmarés |
| R5 | `Gap.dc.html` | Diferencia de puntos |
| R6 | `Bump.dc.html` | Posición en la general |
| R7 | `Consistencia.dc.html` | Regularidad |
| R8 | `CaraACara.dc.html` | Cara a cara |
| R9 | `Distribucion.dc.html` | Distribución de puntos |
| R10 | `HeatmapGP.dc.html` | Mapa de calor por GP |
| R11 | `AciertosTipo.dc.html` | Aciertos por tipo |
| R12 | `Titulo.dc.html` | Lucha por el título |
| R13 | `Sesiones.dc.html` | Puntos por sesión |
| U1 | `Perfil.dc.html` | Mi perfil |
| U2 | `PerfilUsuario.dc.html` | Perfil de otro usuario |
| U3 | `Ajustes.dc.html` | Ajustes de cuenta |
| U4 | `Notificaciones.dc.html` | Notificaciones |
| M1 | `AdminPanel.dc.html` | Panel de administración |
| M2 | `AdminGPs.dc.html` | Grandes Premios (admin) |
| M3 | `AdminGPEditar.dc.html` | Editar Gran Premio |
| M4 | `AdminPilotosGP.dc.html` | Pilotos del Gran Premio |
| M5 | `AdminSesiones.dc.html` | Sesiones y resultados |
| M6 | `AdminCircuitos.dc.html` | Circuitos (admin) |
| M7 | `AdminCircuitoEditar.dc.html` | Editar circuito |
| M8 | `AdminPilotos.dc.html` | Pilotos y equipos |
| M9 | `AdminReglas.dc.html` | Reglas de puntuación |
| M10 | `AdminUsuarios.dc.html` | Usuarios (solo lectura) |
| M11 | `AdminComunidades.dc.html` | Comunidades (solo lectura) |
| M12 | `AdminNotificaciones.dc.html` | Enviar notificaciones |
| M13 | `AdminCalculos.dc.html` | Cálculo de puntos |

Piezas compartidas (AppNav, SiteFooter, TabBar, MobileBar, AdminSide, RankNav) y tableros de guía (fundamentos, componentes, navegación, gráficos, estados, flags) están en la misma carpeta; las issues F1–F6 y N1–N4 los citan.
