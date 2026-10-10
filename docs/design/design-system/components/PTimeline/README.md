# PTimeline

Vertical timeline of events with a coloured rail and icon markers.

Source: `src/components/lib/PTimeline.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`PTimelineItem`s inside `PTimeline`; each item takes free content in its slot.

## Props (PTimelineItem)
`variant`: `default` (gray) `primary` (`brand-accent-500`) `warning` `danger`; `icon`: a Font Awesome class for the 24px marker.
