# PTabs

Tabs with an underline indicator, in a plain and a boxed variant; panels slide in.

Source: `src/components/lib/PTabs.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`v-model` with the active tab name; `PTabItem`s in the `tabs` slot (`name`, `label`, optionally `to` or `href`) and `PTabPanel`s (`name`) in the default slot.

## Props
`variant`: `default` or `boxed` (tab bar on `surface-muted`, panel in a bordered box).

## Notes
- The active tab is Tailwind `blue-600` over a `blue-500` underline and sits 4px to the right; this is the one place the UI uses blue instead of brand purple. Keep it as is for now; new navigation should use `brand-600`.
- Transitions are 200ms ease-out and are disabled under `prefers-reduced-motion`.
