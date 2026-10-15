<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { totalsTable } from '@/lib/rankingTotals'
import { useSessionStore } from '@/stores/session'

/**
 * Degraded ranking: `…/points` is empty but `…/totaluserpoints` has totals, so only the final
 * table by username can be shown (no per-GP detail).
 */
const props = defineProps<{ totals: Record<string, number> }>()
const { t, n } = useI18n()
const session = useSessionStore()
const rows = computed(() => totalsTable(props.totals, session.user?.username))
</script>

<template>
  <section class="bg-surface ring-card-ring min-w-0 rounded-lg p-5 ring-1">
    <h2 class="text-ink text-lg font-semibold">{{ t('ranking.totalsOnly.title') }}</h2>
    <p class="text-ink-muted mb-4 text-sm">{{ t('ranking.totalsOnly.text') }}</p>
    <table class="w-full table-fixed text-sm">
      <caption class="sr-only">
        {{
          t('ranking.totalsOnly.title')
        }}
      </caption>
      <thead>
        <tr class="text-ink-muted text-left">
          <th scope="col" class="w-14 py-2">{{ t('ranking.cols.pos') }}</th>
          <th scope="col" class="py-2">{{ t('ranking.cols.player') }}</th>
          <th scope="col" class="w-32 py-2 text-right">{{ t('ranking.cols.points') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in rows"
          :key="r.name"
          class="border-card-ring border-t"
          :class="r.you ? 'font-semibold' : ''"
        >
          <td class="py-2 tabular-nums">{{ r.pos }}</td>
          <td class="truncate py-2">{{ r.name }}</td>
          <td class="py-2 text-right tabular-nums">{{ n(r.total) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
