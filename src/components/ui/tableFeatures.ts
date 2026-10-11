import {
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/vue-table'

/** Features PTable registers (sorting only: pagination is PPagination's job). */
export const uiTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

export type UiTableFeatures = typeof uiTableFeatures

/** Column definition for PTable. `meta: { align: 'right' }` right-aligns figures. */
export type PTableColumn<T extends RowData> = ColumnDef<UiTableFeatures, T>
