<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaceResult } from '@/api/schemas'
import Avatar from '@/components/ui/Avatar.vue'
import { formatPoints, ordinal, teamColor } from '@/lib/gp'
import { cellFor, type Moment, type ResultRow } from '@/lib/results'
import ResultCell from './ResultCell.vue'

/**
 * Community table of a session. It changes with the moment: before closing only your own row
 * shows drivers, once closed everyone's do, and with results a «Resultado real» row heads the
 * table and every cell is classed by hit. Horizontal scroll stays inside `.tw` (focusable).
 */
const props = defineProps<{
  rows: ResultRow[]
  positions: number
  moment: Moment
  /** Classified results (no fastest lap). */
  results: readonly RaceResult[]
  caption: string
}>()
const { t } = useI18n()
const cols = computed(() => Array.from({ length: props.positions }, (_, i) => i + 1))
const real = computed(() =>
  cols.value.map((p) => props.results.find((r) => r.position === p)?.driver),
)
const num = (n: number | undefined) => (n == null ? '—' : formatPoints(n))
const res = computed(() => props.moment === 'res')

const th =
  'table-head bg-surface-muted text-muted border-border border-b px-3 py-2.5 whitespace-nowrap'
</script>

<template>
  <div class="tw" tabindex="0" role="region" :aria-label="t('results.scroll')">
    <table class="w-full border-collapse text-sm leading-5">
      <caption class="sr-only">
        {{
          caption
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col" :class="[th, 'text-left']">{{ t('results.col.rank') }}</th>
          <th scope="col" :class="[th, 'text-left']">{{ t('results.col.player') }}</th>
          <th v-for="p in cols" :key="p" scope="col" :class="[th, 'text-center']">
            {{ ordinal(p) }}
          </th>
          <th scope="col" :class="[th, 'text-right']">{{ t('results.col.exacts') }}</th>
          <th scope="col" :class="[th, 'text-right']">{{ t('results.col.session') }}</th>
          <th scope="col" :class="[th, 'text-right']">{{ t('results.col.total') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-if="res"
          data-row="real"
          class="bg-brand-900 dark:bg-brand-200 dark:text-brand-900 text-white"
        >
          <td class="px-3 py-2" />
          <th scope="row" class="px-3 py-2 text-left font-bold whitespace-nowrap">
            {{ t('results.real') }}
          </th>
          <td v-for="(d, i) in real" :key="i" class="px-2 py-2 text-center">
            <span v-if="d" class="inline-flex min-w-12 items-center justify-center gap-1 font-bold">
              <span
                aria-hidden="true"
                class="bg-border-input h-3.5 w-[3px] flex-none rounded-sm"
                :style="teamColor(d) ? { backgroundColor: teamColor(d) } : undefined"
              />
              {{ d.code ?? d.lastname }}
            </span>
          </td>
          <td colspan="3" />
        </tr>
        <tr
          v-for="r in rows"
          :key="r.id"
          :data-row="r.you ? 'me' : 'player'"
          class="border-border border-b last:border-b-0"
          :class="r.you ? 'bg-tint' : ''"
        >
          <td class="text-heading px-3 py-1.5 font-semibold tabular-nums">{{ r.rank }}</td>
          <th scope="row" class="px-3 py-1.5 text-left font-semibold whitespace-nowrap">
            <RouterLink
              :to="`/u/${r.username}`"
              class="text-heading inline-flex min-h-11 items-center gap-2 hover:underline"
            >
              <Avatar :name="r.username" :size="24" :you="r.you" />
              <span class="max-w-[160px] truncate">{{ r.username }}</span>
              <span v-if="r.you" class="text-muted font-normal">{{ t('results.you') }}</span>
            </RouterLink>
          </th>
          <td v-for="p in cols" :key="p" class="px-2 py-1.5 text-center">
            <ResultCell :cell="cellFor(moment, r.you, p, r.picks[p], results)" />
          </td>
          <td class="px-3 py-1.5 text-right tabular-nums">
            {{ res && r.hasPick ? num(r.exacts) : '—' }}
          </td>
          <td class="text-heading px-3 py-1.5 text-right font-semibold tabular-nums">
            {{ res ? num(r.points) : '—' }}
          </td>
          <td class="text-muted px-3 py-1.5 text-right tabular-nums">{{ num(r.total) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
