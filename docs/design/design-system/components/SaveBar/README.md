# SaveBar

Sticky bar at the bottom of an edit form that appears only while there are unsaved changes.

## Props
| prop | values | default |
| --- | --- | --- |
| `count` | number of changed fields | — |
| `saving` | boolean | `false` |

## Usage
- Inverted ground (gray-900 in light, gray-100 in dark) so it reads as a layer above the form; `shadow-lg`, 8px radius, 16px from the bottom.
- Two actions: «Descartar» (ghost) and «Guardar cambios» (primary). While saving, the primary shows «Guardando...».
- Leaving the page with changes asks inside the page, never with `confirm()`.
- Source: redesign canvas (AdminGPEditar, AdminPilotosGP, AdminReglas).
