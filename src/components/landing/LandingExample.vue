<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import HitCell from '@/components/data/HitCell.vue'
import PCard from '@/components/ui/PCard.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { focusRing } from '@/components/ui/styles'
import { DEMO_DRIVERS, DEMO_PLAYERS, DEMO_RESULT, DEMO_TOPN } from '@/content/landing-demo'
import { formatFinish, scorePrediction } from './scoring'

const { t } = useI18n()
const playerId = ref(DEMO_PLAYERS[0]!.id)
const options = DEMO_PLAYERS.map((p) => ({ value: p.id, label: p.label }))
const player = computed(() => DEMO_PLAYERS.find((p) => p.id === playerId.value) ?? DEMO_PLAYERS[0]!)
const scored = computed(() => scorePrediction(player.value.prediction, DEMO_RESULT))
const rows = computed(() =>
  scored.value.cells.map((c, k) => ({
    pos: k + 1,
    driver: DEMO_DRIVERS[c.code]!,
    finish: formatFinish(c.finish, DEMO_TOPN),
    kind: c.kind,
    points: c.points,
  })),
)
</script>

<template>
  <section class="mx-auto w-full max-w-(--container-xl) px-4 pb-[72px] sm:px-6">
    <div class="grid items-center gap-12 min-[900px]:grid-cols-2">
      <PCard :padded="false" class="overflow-hidden">
        <template #header>
          <div class="flex flex-col">
            <h3 class="text-heading m-0 text-base font-semibold">
              {{ t('landing.example.cardTitle') }}
            </h3>
            <span class="text-muted text-xs">
              {{ t('landing.example.cardSubtitle') }} · {{ t('landing.example.demoNote') }}
            </span>
          </div>
          <SegmentedControl
            v-model="playerId"
            :options="options"
            :label="t('landing.example.player')"
          />
        </template>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-sm tabular-nums">
            <caption class="sr-only">
              {{
                t('landing.example.caption', { player: player.label })
              }}
            </caption>
            <thead>
              <tr class="t-up text-muted border-border border-b">
                <th scope="col" class="px-4 py-3 text-center">{{ t('landing.example.pos') }}</th>
                <th scope="col" class="px-4 py-3">{{ t('landing.example.prediction') }}</th>
                <th scope="col" class="px-4 py-3">{{ t('landing.example.finished') }}</th>
                <th scope="col" class="px-4 py-3 text-right">{{ t('landing.example.points') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.pos" class="border-border border-b">
                <td class="px-4 py-2 text-center">{{ r.pos }}</td>
                <td class="px-4 py-2">
                  <span class="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      class="h-5 w-1 flex-none rounded-xs"
                      :style="{ backgroundColor: r.driver.teamColor }"
                    />
                    <b class="text-heading">{{ r.driver.name }}</b>
                  </span>
                </td>
                <td class="text-muted px-4 py-2">{{ r.finish }}</td>
                <td class="px-4 py-2 text-right">
                  <HitCell :kind="r.kind" :label="String(r.points)" />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colspan="3" class="text-heading p-3 text-right">
                  {{ t('landing.example.total') }}
                </th>
                <td
                  class="text-heading p-3 text-right text-lg font-bold"
                  data-testid="example-total"
                >
                  {{ t('landing.example.totalPoints', { n: scored.total }) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </PCard>
      <div class="flex flex-col items-start gap-4">
        <p class="t-up text-muted m-0">{{ t('landing.example.eyebrow') }}</p>
        <h2 class="text-heading m-0 text-[30px] leading-[38px] font-semibold text-balance">
          {{ t('landing.example.title') }}
        </h2>
        <p class="text-muted m-0">{{ t('landing.example.text') }}</p>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          <li class="flex items-center gap-3">
            <HitCell kind="exact" label="5" aria-hidden="true" />
            <b class="text-heading">{{ t('landing.example.exact') }}</b>
          </li>
          <li class="flex items-center gap-3">
            <HitCell kind="near" label="3" aria-hidden="true" />
            <b class="text-heading">{{ t('landing.example.near') }}</b>
          </li>
          <li class="flex items-center gap-3">
            <HitCell kind="far" label="1" aria-hidden="true" />
            <b class="text-heading">{{ t('landing.example.far') }}</b>
          </li>
          <li class="flex items-center gap-3">
            <HitCell kind="miss" label="0" aria-hidden="true" />
            <span class="text-muted">{{ t('landing.example.miss') }}</span>
          </li>
        </ul>
        <RouterLink
          to="/rules#ejemplo"
          :class="['text-tint-fg rounded-sm text-sm underline', focusRing]"
        >
          {{ t('landing.example.more') }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>
