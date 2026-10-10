# PSwitch

Toggle switch for on/off settings; label in the default slot.

Source: `src/components/lib/forms/PSwitch.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`v-model` (boolean); it also emits `onSwitch` with the new value.

## Props
`color` (track when on) and `inactiveColor` (track when off): `primary` `secondary` `success` `warning` `danger` `gray`. Defaults: `primary` (`brand-500`) and `gray`.

## Notes
- Track 44×24px, thumb 20px, both `rounded-full`. Carries its own `mb-5`.
