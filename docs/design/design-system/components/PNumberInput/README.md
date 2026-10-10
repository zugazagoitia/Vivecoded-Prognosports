# PNumberInput

Number input that never leaves the model empty: clearing it restores the last value.

Source: `src/components/lib/forms/PNumberInput.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`v-model` (number, required); optional `min`, `max`, `step` (default 1). No label: wrap it in `PField`.
