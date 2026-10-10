# Breadcrumb

Route trail built from the router: a home icon, links for each ancestor, the current page in bold.

Source: `src/components/lib/Breadcrumb.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
Nothing: it reads the crumbs from `useBreadcrumbs()` (route `meta.title` and the dynamic title set by `PPage`). Hidden below `sm`, where `PPage` shows a single back link instead.

## Notes
- Links hover to `brand-500` (`brand-400` in dark). Separators are 12px chevrons in `gray-400`.
