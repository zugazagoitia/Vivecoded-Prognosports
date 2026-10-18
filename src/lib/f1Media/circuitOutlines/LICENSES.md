# Licencias de los trazados de circuito

| Fichero          | Fuente                                                          | Licencia                           | Notas                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data.ts` (todo) | https://github.com/bacinger/f1-circuits (`f1-circuits.geojson`) | MIT, © 2019-2025 Tomislav Bacinger | Comprobada en `LICENSE.md` del repositorio. Las coordenadas se proyectan y se simplifican a rutas SVG enteras en una caja de 300. Sin marcas de F1 en los datos. |

Los datos geográficos proceden de OpenStreetMap contributors (ODbL) según el proyecto de origen; el trazado se dibuja como SVG propio. El proyecto no está afiliado a Formula One Licensing B.V.

Regenerar: convertir el GeoJSON con un script que proyecte (x·cos(lat), −y), escale a 280 y redondee a enteros. Añadir aquí una fila por cada nueva fuente antes de incluirla.
