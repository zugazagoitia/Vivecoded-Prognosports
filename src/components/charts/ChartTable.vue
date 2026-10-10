<script setup lang="ts">
import type { TableModel } from './model'

// Equivalent data table ("Ver como tabla"), generated from the same series as the chart.
defineProps<{ table: TableModel; caption: string }>()
</script>

<template>
  <div class="ch-table-wrap" role="region" :aria-label="caption" tabindex="0">
    <table class="ch-table">
      <caption class="ch-sr">
        {{
          caption
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col" class="ch-th-name">Jugador</th>
          <th v-for="c in table.columns" :key="c" scope="col" class="ch-th-num">{{ c }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in table.rows" :key="r.id" :class="{ 'ch-row-me': r.isMe }">
          <th scope="row" class="ch-th-name">{{ r.isMe ? `${r.name} (tú)` : r.name }}</th>
          <td v-for="(v, i) in r.cells" :key="i" class="ch-td-num tn">{{ v }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style>
.ch-table-wrap {
  overflow-x: auto;
  border-radius: 8px;
}
.ch-table-wrap:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.ch-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 14px;
  line-height: 20px;
  color: var(--color-text-body);
}
.ch-table th,
.ch-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.ch-th-name {
  position: sticky;
  left: 0;
  text-align: left;
  background: var(--color-surface);
  font-weight: 600;
  color: var(--color-text-heading);
}
.ch-th-num {
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
}
.ch-td-num {
  text-align: right;
}
.ch-row-me .ch-th-name,
.ch-row-me .ch-td-num {
  background: var(--color-tint);
  color: var(--color-tint-fg);
  font-weight: 700;
}
.ch-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
