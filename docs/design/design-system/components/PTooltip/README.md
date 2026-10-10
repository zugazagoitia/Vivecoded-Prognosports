# PTooltip

Hover and focus tooltip positioned with Floating UI, with an arrow and six variants.

Source: `src/components/lib/PTooltip.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
The trigger in the default slot and `label` (or a `tooltip` slot for rich content).

## Props
`placement`: any Floating UI placement (default `top`; it flips and shifts 8px from the viewport edge). `variant`: `default` `light` `danger` `success` `warning` `info`.

## Notes
- Fades in over 200ms, out over 150ms. `default` inverts with the theme: `gray-900` bubble in light mode, white in dark mode.
- Status variants use Tailwind's stock `red-600`, `green-500`, `yellow-500`, `blue-600`, not the semantic scales.
- The preview shows the open state; in the app it opens on hover or focus.
