# PPagination

Result count and page buttons for long lists and tables.

Source: `src/components/lib/PPagination.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`total` and `perPage` (required); it emits `update:currentPage`. Optional `initialCurrent`, `rangeBefore`, `rangeAfter` (pages shown around the current one, default 1 each).

## Notes
- The current page is Tailwind `indigo-600`, a leftover; new work should use `primary`.
- Copy: `Mostrando de 11 a 20 de un total de 48 resultados`. `PTable` includes it when paginated.
