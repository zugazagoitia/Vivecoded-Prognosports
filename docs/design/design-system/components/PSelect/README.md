# PSelect

Native select with the app chrome and a chevron; options go in the default slot.

Source: `src/components/lib/forms/PSelect.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`v-model` (required) and `<option>` elements in the default slot. The placeholder defaults to `Selecciona una opción`.

## Props
`name`, `label`, `placeholder`, `disabled`, `multiple`; `size` and `color` are accepted but have no styles in the source.

## Notes
- Drift from PInput: radius is `rounded-lg` (inputs are `rounded-md`) and focus is Tailwind `blue-500`, not `brand-500`. Prefer the PInput values in new work.
