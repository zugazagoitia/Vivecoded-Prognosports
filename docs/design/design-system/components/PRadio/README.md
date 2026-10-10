# PRadio

Native radio with the same colour set as PCheckbox and three sizes.

Source: `src/components/lib/forms/PRadio.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`v-model` and `value` (both required); label in the slot.

## Props
`color`: `primary` `secondary` `gray` `warning` `danger`; `size`: `small` (16px) `medium` (20px) `large` (24px), which also sets the label to 14, 16 or 18px.
