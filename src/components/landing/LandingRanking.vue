<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import { DEMO_RANKING } from '@/content/landing-demo'
import RankPos from './RankPos.vue'
import { formatGap } from './scoring'

defineProps<{ mobile?: boolean }>()
const { t } = useI18n()

// Top 5 by points, descending.
const rows = [...DEMO_RANKING.rows].sort((a, b) => b.points - a.points).slice(0, 5)
const leader = rows[0]!.points
</script>

<template>
  <section class="bg-surface shadow-[0_1px_0_var(--color-border),0_-1px_0_var(--color-border)]">
    <div
      class="mx-auto w-full max-w-(--container-xl) px-4"
      :class="mobile ? 'flex flex-col gap-4 py-10' : 'py-[72px] sm:px-6'"
    >
      <template v-if="mobile">
        <p class="t-up text-muted m-0">{{ t('landing.ranking.eyebrow') }}</p>
        <h2 class="t-subtitle text-heading m-0">{{ t('landing.ranking.titleShort') }}</h2>
        <PCard :padded="false" class="overflow-hidden" :aria-label="t('landing.ranking.cardTitle')">
          <table class="w-full border-collapse text-left tabular-nums">
            <thead class="sr-only">
              <tr>
                <th scope="col">{{ t('landing.ranking.pos') }}</th>
                <th scope="col">{{ t('landing.ranking.player') }}</th>
                <th scope="col">{{ t('landing.ranking.points') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in rows"
                :key="r.name"
                class="border-border border-b last:border-b-0"
                :class="r.isYou ? 'bg-tint' : ''"
              >
                <td class="px-3 py-2"><RankPos :index="i" /></td>
                <td class="text-heading py-2 text-sm font-semibold">{{ r.name }}</td>
                <td class="text-heading px-3 py-2 text-right font-bold">{{ r.points }}</td>
              </tr>
            </tbody>
          </table>
        </PCard>
      </template>
      <div v-else class="grid items-center gap-12 min-[900px]:grid-cols-2">
        <div class="flex flex-col gap-4">
          <p class="t-up text-muted m-0">{{ t('landing.ranking.eyebrow') }}</p>
          <h2 class="text-heading m-0 text-[30px] leading-[38px] font-semibold">
            {{ t('landing.ranking.title') }}
          </h2>
          <p class="text-muted m-0">{{ t('landing.ranking.text') }}</p>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li v-for="(b, i) in 3" :key="b" class="flex items-center gap-3">
              <PIcon name="circle-check" :size="20" class="text-ok flex-none" />
              <span>{{ t(`landing.ranking.benefits[${i}]`) }}</span>
            </li>
          </ul>
        </div>
        <PCard :padded="false" class="overflow-hidden">
          <template #header>
            <h3 class="text-heading m-0 text-base font-semibold">
              {{ t('landing.ranking.cardTitle') }}
            </h3>
            <PTag color="brand">{{
              t('landing.ranking.afterGps', { n: DEMO_RANKING.afterGps })
            }}</PTag>
          </template>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-sm tabular-nums">
              <thead>
                <tr class="t-up text-muted border-border border-b">
                  <th scope="col" class="px-4 py-3">{{ t('landing.ranking.pos') }}</th>
                  <th scope="col" class="px-4 py-3">{{ t('landing.ranking.player') }}</th>
                  <th scope="col" class="px-4 py-3 text-right">
                    {{ t('landing.ranking.points') }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-right">
                    <span class="sr-only">{{ t('landing.ranking.gap') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, i) in rows"
                  :key="r.name"
                  class="border-border border-b last:border-b-0"
                  :class="r.isYou ? 'bg-tint' : ''"
                >
                  <td class="px-4 py-2"><RankPos :index="i" /></td>
                  <td class="px-4 py-2">
                    <span class="flex items-center gap-2">
                      <Avatar :name="r.name" :size="24" :you="r.isYou" />
                      <b class="text-heading">{{ r.name }}</b>
                    </span>
                  </td>
                  <td class="text-heading px-4 py-2 text-right font-bold">{{ r.points }}</td>
                  <td class="text-muted px-4 py-2 text-right text-xs">
                    {{ formatGap(leader, r.points, i) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </PCard>
      </div>
    </div>
  </section>
</template>
