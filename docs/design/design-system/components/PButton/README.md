# PButton

The one button: four types, twelve colour names, three sizes; renders a `button`, `a`, `router-link` or `input`.

Source: `src/components/lib/forms/PButton.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## When to use
- `type="solid"` + `color="primary"` for the main action of a view (`Registrarse`, `Guardar cambios`). One per group.
- `type="outline"` for the secondary action beside it (`Iniciar sesión`); `type="soft"` with `color="info"` for `Cancelar` in modals; `type="ghost"` for tertiary actions.
- Status colours (`success`, `danger`, `warning`, `info`) only when the action carries that meaning.

## Props
| prop | values | default |
| --- | --- | --- |
| `type` | `solid` `outline` `soft` `ghost` | `solid` |
| `color` | `primary` `success` `danger` `warning` `info` `red` `yellow` `green` `teal` `blue` `purple` `pink` | `primary` |
| `size` | `small` `medium` `large` | `medium` |
| `pilled` | boolean: `rounded-full` instead of `rounded-md` | `false` |
| `expanded` | boolean: full width | `false` |
| `disabled` | boolean: 50% opacity, not-allowed cursor | `false` |
| `icon` | a Font Awesome class string, e.g. `fa fa-plus` | `""` |
| `label` | text, or use the default slot | `""` |
| `tag`, `to`, `nativeType` | element, route, `button` `submit` `reset` | `button`, `""`, `button` |

`red`=`danger`, `yellow`=`warning`, `green`=`success`, `blue`=`info`, `purple`=`primary`.

## Notes
- The primary fill is `brand-accent-500`, not `brand-500`.
- Pressing scales the button to 95%. There is no focus ring in the source.
- Contrast: label on `success`, `teal`, `danger` and `pink` solid fills is below 4.5:1 (see the token notes).
