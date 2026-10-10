# ValidationList

A readiness checklist: one line per requirement, each with an icon and words, coloured by state.

## Props
| prop | values | default |
| --- | --- | --- |
| `items` | `{label, state: 'ok' | 'warn' | 'err', href?}` | — |

## Usage
- Text uses the 700 step of `success`, `warning` (800) and `error` on light grounds, 300 in dark: 4.5:1 or better.
- Each line can link to the screen that fixes it. Put the list at the top of an edit page and in the admin dashboard for the next GP.
- Source: redesign canvas (AdminPanel, AdminGPEditar).
