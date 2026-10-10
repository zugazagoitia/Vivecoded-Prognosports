<script setup lang="ts" generic="T extends RowData">
import { FlexRender, useTable, type RowData } from '@tanstack/vue-table'
import { useI18n } from 'vue-i18n'
import PIcon from './PIcon.vue'
import { focusRing } from './styles'
import { uiTableFeatures, type PTableColumn } from './tableFeatures'

const props = defineProps<{
  columns: PTableColumn<T>[]
  data: T[]
  /** Accessible name of the table. */
  caption: string
  /** Marks the signed-in user's row (`me`). */
  isMine?: (row: T) => boolean
}>()
const { t } = useI18n()

const table = useTable({
  features: uiTableFeatures,
  get columns() {
    return props.columns
  },
  get data() {
    return props.data
  },
})

function ariaSort(dir: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  return dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'
}
function alignClass(meta: unknown): string {
  return (meta as { align?: string } | undefined)?.align === 'right'
    ? 'text-right tabular-nums'
    : 'text-left'
}
</script>

<template>
  <div class="ring-border overflow-x-auto rounded-lg ring-1">
    <table class="w-full border-collapse text-sm leading-5">
      <caption class="sr-only">
        {{
          caption
        }}
      </caption>
      <thead>
        <tr v-for="group in table.getHeaderGroups()" :key="group.id">
          <th
            v-for="header in group.headers"
            :key="header.id"
            scope="col"
            :aria-sort="
              header.column.getCanSort() ? ariaSort(header.column.getIsSorted()) : undefined
            "
            :class="[
              'table-head bg-surface-muted text-muted border-border border-b px-3 py-2.5 whitespace-nowrap',
              alignClass(header.column.columnDef.meta),
            ]"
          >
            <template v-if="!header.isPlaceholder">
              <button
                v-if="header.column.getCanSort()"
                type="button"
                :class="[
                  'hover:text-heading -mx-1 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm px-1 uppercase md:min-h-8',
                  focusRing,
                ]"
                @click="header.column.toggleSorting(header.column.getIsSorted() === 'asc')"
              >
                <FlexRender :header="header" />
                <PIcon
                  :name="header.column.getIsSorted() ? 'chevron-down' : 'minus'"
                  :size="16"
                  :class="header.column.getIsSorted() === 'asc' ? 'rotate-180' : ''"
                />
                <span class="sr-only">{{
                  header.column.getIsSorted() === 'asc'
                    ? t('ui.table.sortDesc')
                    : t('ui.table.sortAsc')
                }}</span>
              </button>
              <FlexRender v-else :header="header" />
            </template>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          :class="['group', isMine?.(row.original) ? 'me' : '']"
          :aria-current="isMine?.(row.original) ? 'true' : undefined"
        >
          <td
            v-for="cell in row.getAllCells()"
            :key="cell.id"
            :class="[
              'border-border text-body border-b px-3 py-2.5 whitespace-nowrap group-last:border-b-0',
              isMine?.(row.original)
                ? 'bg-tint text-tint-fg font-semibold'
                : 'group-hover:bg-surface-hover',
              alignClass(cell.column.columnDef.meta),
            ]"
          >
            <FlexRender :cell="cell" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
