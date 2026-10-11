<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState } from '@/components/states'
import Kpi from '@/components/ui/Kpi.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { formatPoints } from '@/lib/gp'
import {
  diffHit,
  exactPoints,
  joinNames,
  maxPossible,
  pointsText,
  type Bonus,
  type BreakdownRow,
  type ResultRow,
  type Rules,
} from '@/lib/results'

/**
 * «Tu desglose»: your KPIs, your prediction against the real result position by position, the
 * GP bonus and the access to the simulator (G6). Points come from the API; rules only label them.
 */
const props = defineProps<{
  rows: BreakdownRow[]
  me: ResultRow | undefined
  players: number
  positions: number
  near: number
  rules?: Rules
  bonus: Bonus
  simulatorTo: string
  caption: string
}>()
const { t } = useI18n()

const exact = computed(() => exactPoints(props.rules))
const max = computed(() => maxPossible(props.rules, props.positions))
const nearA = computed(() => props.rules?.next ?? props.rules?.previous)
const nearB = computed(() => props.rules?.nextOfFollowing ?? props.rules?.previousOfPrevious)
const num = (n: number | undefined) => (n == null ? '—' : formatPoints(n))

const th =
  'table-head bg-surface-muted text-muted border-border border-b px-3 py-2.5 whitespace-nowrap'
const PILL: Record<string, string> = {
  exact: 'bg-hit-exact text-hit-exact-fg border-hit-exact-fg border-solid',
  near: 'bg-hit-near text-hit-near-fg border-hit-near-fg border-dashed',
  far: 'bg-hit-far text-hit-far-fg border-hit-far-fg border-dotted',
  miss: 'text-muted border-border-input border-solid font-normal',
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="grid4">
      <PCard :padded="false">
        <Kpi
          :label="t('results.kpi.points')"
          :value="num(me?.points)"
          :delta="max != null ? t('results.kpi.pointsOf', { n: formatPoints(max) }) : undefined"
        />
      </PCard>
      <PCard :padded="false">
        <Kpi
          :label="t('results.kpi.exacts')"
          :value="num(me?.exacts)"
          :delta="exact != null ? t('results.kpi.exactsEach', { n: exact }) : undefined"
        />
      </PCard>
      <PCard :padded="false">
        <Kpi
          :label="t('results.kpi.near')"
          :value="rows.length ? near : '—'"
          :delta="
            nearA != null && nearB != null
              ? t('results.kpi.nearEach', { a: nearA, b: nearB })
              : undefined
          "
        />
      </PCard>
      <PCard :padded="false">
        <Kpi
          :label="t('results.kpi.rank')"
          :value="me?.rank ?? '—'"
          :delta="t('results.kpi.rankOf', { n: players }, players)"
        />
      </PCard>
    </div>

    <div class="split">
      <PCard :title="t('results.breakdown.title')" :padded="false">
        <EmptyState
          v-if="!rows.length"
          icon="search_off"
          :title="t('results.breakdown.none')"
          :text="t('results.breakdown.noneText')"
        />
        <template v-else>
          <div class="tw" tabindex="0" role="region" :aria-label="t('results.breakdown.title')">
            <table class="w-full border-collapse text-sm leading-5">
              <caption class="sr-only">
                {{
                  caption
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col" :class="[th, 'text-left']">{{ t('results.breakdown.pos') }}</th>
                  <th scope="col" :class="[th, 'text-left']">{{ t('results.breakdown.real') }}</th>
                  <th scope="col" :class="[th, 'text-left']">{{ t('results.breakdown.mine') }}</th>
                  <th scope="col" :class="[th, 'text-left']">{{ t('results.breakdown.diff') }}</th>
                  <th scope="col" :class="[th, 'text-right']">
                    {{ t('results.breakdown.points') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in rows"
                  :key="r.position"
                  class="border-border border-b last:border-b-0"
                >
                  <th scope="row" class="text-muted px-3 py-2 text-left font-bold tabular-nums">
                    {{ r.position }}
                  </th>
                  <td class="px-3 py-2">
                    <span class="inline-flex items-center gap-2 font-bold">
                      <span
                        aria-hidden="true"
                        class="bg-border-input h-[18px] w-[3px] flex-none rounded-sm"
                        :style="r.real.color ? { backgroundColor: r.real.color } : undefined"
                      />{{ r.real.code }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="r.mine" class="inline-flex items-center gap-2 font-semibold">
                      <span
                        aria-hidden="true"
                        class="bg-border-input h-[18px] w-[3px] flex-none rounded-sm"
                        :style="r.mine.color ? { backgroundColor: r.mine.color } : undefined"
                      />{{ r.mine.code }}
                    </span>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      :data-diff="r.diff"
                      class="inline-flex min-h-8 items-center rounded-md border-2 px-2 text-[13px] font-semibold whitespace-nowrap"
                      :class="PILL[diffHit(r.diff)]"
                      >{{ t(`results.diff.${r.diff}`) }}</span
                    >
                  </td>
                  <td class="text-heading px-3 py-2 text-right font-semibold tabular-nums">
                    {{ num(r.points) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-muted px-5 py-3 text-[13px]">{{ t('results.breakdown.note') }}</p>
        </template>
      </PCard>

      <aside class="flex min-w-0 flex-col gap-6">
        <PCard :title="t('results.bonus.title')">
          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span class="text-muted text-sm">{{ t('results.bonus.label') }}</span>
              <b data-bonus class="text-heading text-right font-semibold">{{
                bonus.names.length
                  ? t('results.bonus.value', {
                      names: joinNames(bonus.names),
                      points: pointsText(bonus.points),
                    })
                  : t('results.bonus.pending')
              }}</b>
            </div>
            <p v-if="bonus.names.length && !bonus.confirmed" class="text-muted text-[13px]">
              {{ t('results.bonus.provisional') }}
            </p>
            <p class="text-muted text-[13px]">
              {{
                bonus.award != null
                  ? t('results.bonus.text', { award: pointsText(bonus.award) })
                  : t('results.bonus.textNoAward')
              }}
            </p>
          </div>
        </PCard>
        <PCard tag="section">
          <div class="flex flex-col gap-3">
            <PTitle level="header" as="h2">{{ t('results.sim.title') }}</PTitle>
            <p class="text-muted text-sm">{{ t('results.sim.text') }}</p>
            <PButton :to="simulatorTo" variant="soft" icon="chart-line">{{
              t('results.sim.action')
            }}</PButton>
          </div>
        </PCard>
      </aside>
    </div>
  </div>
</template>
