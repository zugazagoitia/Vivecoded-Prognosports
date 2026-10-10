# Loading

Centred spinner for content that is still loading.

Source: `src/components/lib/Loading.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## When to use
While a view fetches its data. `PPage` shows it for you when `loading` is true. No props.

## Notes
- 32px ring, 4px stroke, Tailwind `slate-300` track with a `cyan-500` head: the only cyan in the UI. Announces "Cargando contenido" to screen readers.
