# PInput

Text input or textarea with optional label, helper message, leading icon and error state.

Source: `src/components/lib/forms/PInput.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`v-model`, and usually `label`. Add `message` for helper text under the label, `icon` (Font Awesome class) for a leading glyph, `error` to turn the border `error-500`.

## Props
| prop | values | default |
| --- | --- | --- |
| `label`, `message`, `name`, `placeholder` | string | `""` |
| `type` | any native input type | `text` |
| `size` | `small` `medium` `large` | `medium` |
| `icon` | Font Awesome class string | none |
| `isTextarea`, `rows` | boolean, number | `false`, `3` |
| `error` | boolean | `false` |
| `noMargin` | boolean: drops the `mb-3` | `false` |
| `maxLenght` | number (spelled this way in the source) | `128` |

## Notes
- Label is `PLabel`: bold, `tracking-wide`, with the message in 12px below it. `PField` wraps any other control with the same label.
- Focus: border and 1px ring in `brand-500`. Ground is `surface-input`, border `border-input`.
