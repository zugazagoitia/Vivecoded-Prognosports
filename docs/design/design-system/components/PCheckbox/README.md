# PCheckbox

Native checkbox tinted with `accent-color`; the label is the default slot.

Source: `src/components/lib/forms/PCheckbox.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`v-model` (boolean) and the label text in the slot.

## Props
`color`: `primary` `secondary` `gray` `warning` `danger` (default `primary`, `brand-500`); `checked` for an uncontrolled initial value.

## Notes
- `secondary` is Tailwind `blue-500`, not the `secondary` palette.
