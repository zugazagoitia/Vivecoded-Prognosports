<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ordinal } from '@/lib/gp'
import type { ConsensusRowVm, ConsensusView, DriverBar } from './useConsensus'

/** Table alternative of both visualisations (by position / by driver). */
defineProps<{
  view: ConsensusView
  rows: ConsensusRowVm[]
  bars: DriverBar[]
  players: number
  name: string
  showResults: boolean
}>()
const { t } = useI18n()

const th = 'text-muted px-3 py-2 text-left text-xs font-semibold whitespace-nowrap'
const td = 'px-3 py-2 tabular-nums'
</script>

<template>
  <div class="overflow-x-auto">
    <table v-if="view === 'pos'" class="w-full border-collapse text-sm">
      <caption class="sr-only">
        {{
          t('consensus.table.caption')
        }}
      </caption>
      <thead>
        <tr class="border-border border-b">
          <th scope="col" :class="th">{{ t('consensus.table.position') }}</th>
          <th scope="col" :class="th">{{ t('consensus.table.first') }}</th>
          <th scope="col" :class="th">{{ t('consensus.table.second') }}</th>
          <th scope="col" :class="th">{{ t('consensus.table.third') }}</th>
          <th scope="col" :class="th">{{ t('consensus.table.others') }}</th>
          <th scope="col" :class="th">{{ t('consensus.table.mine') }}</th>
          <th v-if="showResults" scope="col" :class="th">{{ t('consensus.table.finisher') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.position" class="border-border border-b last:border-0">
          <th scope="row" :class="[td, 'text-heading text-left font-bold']">
            {{ ordinal(r.position) }}
          </th>
          <td v-for="k in ['k1', 'k2', 'k3', 'k0']" :key="k" :class="td">
            <template v-if="r.segments.find((s) => s.kind === k)">
              <b class="text-heading">{{ r.segments.find((s) => s.kind === k)!.code }}</b>
              {{
                t('consensus.table.votes', {
                  n: r.segments.find((s) => s.kind === k)!.votes,
                  total: players,
                })
              }}
            </template>
            <template v-else>{{ t('consensus.table.none') }}</template>
          </td>
          <td :class="td">
            <b class="text-tint-fg">{{ r.mineCode ?? t('consensus.table.none') }}</b>
          </td>
          <td v-if="showResults" :class="td">{{ r.finisher ?? t('consensus.table.none') }}</td>
        </tr>
      </tbody>
    </table>
    <table v-else class="w-full border-collapse text-sm">
      <caption class="sr-only">
        {{
          t('consensus.table.captionDriver', { name })
        }}
      </caption>
      <thead>
        <tr class="border-border border-b">
          <th scope="col" :class="th">{{ t('consensus.table.position') }}</th>
          <th scope="col" :class="th">{{ t('consensus.table.players') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in bars" :key="b.key" class="border-border border-b last:border-0">
          <th scope="row" :class="[td, 'text-heading text-left font-bold']">{{ b.label }}</th>
          <td :class="td">{{ b.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
