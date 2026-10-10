# PStepper

Numbered steps for multi-part forms; every step stays clickable.

Source: `src/components/lib/PStepper.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`v-model` with the zero-based step index, `steps` (`{label}[]`), and one slot per step named `step-0`, `step-1`, ...

## Notes
- The current step is a `brand-100` chip with a `brand-600` number; the others are plain `gray-600` text. Steps stack vertically below `sm`.
