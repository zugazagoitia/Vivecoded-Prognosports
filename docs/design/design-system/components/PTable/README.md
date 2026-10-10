# PTable

Data table driven by a column definition, with search, sorting, pagination, striped rows and typed cells.

Source: `src/components/lib/table/PTable.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
`columns` (`field`, `label`, optional `sortable`, `type`, `formatter`) and the row data. Column `type` formats the cell: `boolean` renders a `Sí` / `No` pill, `date`, `datetime` and `datediff` render human dates. A `formatter` can be a function or a component (`ColorBadge` is one).

## Notes
- Class strings live in `src/components/lib/table/styles.ts` and are shared with `PSimpleTable`, which takes plain `<tr>` markup in `head`, default and `foot` slots.
- Wrapper: `rounded-lg` with a 1px ring, horizontal scroll on overflow. Header on `surface-muted`, 12px uppercase. Rows hover to `brand-50`.
- Row actions are Font Awesome glyphs: eye in `brand-accent-500`, pencil in `warning-500`, trash in `error-600`.
- Contrast flagged: the `Sí` pill is white on `success-500` (2.3:1).
