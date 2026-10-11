<script setup lang="ts">
/**
 * Plain accessible table of the admin lists: scrolls inside its wrapper (never the page), sticky
 * look of PTable. Put `<thead>` / `<tbody>` in the slot; `.r` right-aligns a column.
 */
defineProps<{ caption: string }>()
</script>

<template>
  <div class="tw">
    <table
      class="admin-table [&_td]:border-border [&_th]:border-border [&_th]:bg-surface-muted [&_tbody_tr:hover_td]:bg-surface-hover [&_th]:text-muted w-full border-collapse text-sm leading-5 tabular-nums [&_.r]:text-right [&_tbody_tr:last-child_td]:border-b-0 [&_td]:border-b [&_td]:px-3 [&_td]:py-2.5 [&_td]:whitespace-nowrap [&_th]:border-b [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:whitespace-nowrap [&_th.r]:text-right"
    >
      <caption class="sr-only">
        {{
          caption
        }}
      </caption>
      <slot />
    </table>
  </div>
</template>

<style>
.admin-table th {
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
</style>
