<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PTitle from '@/components/ui/PTitle.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { focusRing } from '@/components/ui/styles'
import ConsensusBars from './ConsensusBars.vue'
import ConsensusTable from './ConsensusTable.vue'
import DriverBars from './DriverBars.vue'
import type { ConsensusRowVm, ConsensusView, DriverBar } from './useConsensus'

/** «¿Qué ha pronosticado la comunidad?»: by position or by driver, as chart or as table. */
const props = defineProps<{
  rows: ConsensusRowVm[]
  bars: DriverBar[]
  players: number
  hasResults: boolean
  driverName: string
  startsFrom?: number
  driverColor?: string
  finishText: string
  resultsTo: string
}>()
const view = defineModel<ConsensusView>('view', { required: true })
const { t } = useI18n()

const table = ref(false)
const viewOptions = computed(() => [
  { value: 'pos' as const, label: t('consensus.byPosition') },
  { value: 'drv' as const, label: t('consensus.byDriver') },
])
const foot = computed(() =>
  [t('consensus.driver.foot'), props.finishText].filter(Boolean).join(' '),
)
</script>

<template>
  <PCard>
    <template #header>
      <PTitle level="header" as="h2">{{ t('consensus.card.title') }}</PTitle>
      <SegmentedControl v-model="view" :options="viewOptions" :label="t('consensus.viewGroup')" />
    </template>
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p class="text-muted m-0 text-sm">
          {{ view === 'pos' ? t('consensus.card.subPosition') : t('consensus.card.subDriver') }}
        </p>
        <button
          type="button"
          :aria-pressed="table"
          :class="[
            'text-link inline-flex min-h-11 cursor-pointer items-center rounded-sm text-sm underline-offset-2 hover:underline aria-pressed:font-semibold md:min-h-8',
            focusRing,
          ]"
          @click="table = !table"
        >
          {{ table ? t('consensus.card.asChart') : t('consensus.card.asTable') }}
        </button>
      </div>
      <p v-if="view === 'pos'" class="text-muted m-0 text-xs">
        {{ t('consensus.card.players', { n: players }, players) }}
      </p>

      <ConsensusTable
        v-if="table"
        :view="view"
        :rows="rows"
        :bars="bars"
        :players="players"
        :name="driverName"
        :show-results="hasResults"
      />
      <template v-else-if="view === 'pos'">
        <ConsensusBars :rows="rows" :show-results="hasResults" />
        <ul
          class="text-muted m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-2 p-0 pt-2 text-xs"
        >
          <li class="flex items-center gap-1.5">
            <span
              class="bg-brand-700 dark:bg-brand-300 inline-block h-3 w-3.5 rounded-sm"
              aria-hidden="true"
            />{{ t('consensus.legend.first') }}
          </li>
          <li class="flex items-center gap-1.5">
            <span
              class="bg-brand-400 dark:bg-brand-500 inline-block h-3 w-3.5 rounded-sm"
              aria-hidden="true"
            />{{ t('consensus.legend.second') }}
          </li>
          <li class="flex items-center gap-1.5">
            <span
              class="bg-brand-200 dark:bg-brand-700 inline-block h-3 w-3.5 rounded-sm"
              aria-hidden="true"
            />{{ t('consensus.legend.third') }}
          </li>
          <li class="flex items-center gap-1.5">
            <span
              class="bg-surface-muted inline-block h-3 w-3.5 rounded-sm shadow-[inset_0_0_0_2px_var(--color-gold)]"
              aria-hidden="true"
            />{{ t('consensus.legend.mine') }}
          </li>
          <li v-if="hasResults">{{ t('consensus.legend.finisher') }}</li>
        </ul>
        <p v-if="!hasResults" class="text-muted m-0 text-sm" role="note">
          {{ t('consensus.card.noResults') }}
        </p>
      </template>
      <p v-else-if="!bars.length" class="text-muted m-0 text-sm">
        {{ t('consensus.driver.pick') }}
      </p>
      <DriverBars
        v-else
        :name="driverName"
        :starts-from="startsFrom"
        :players="players"
        :bars="bars"
        :color="driverColor"
        :foot="foot"
      />
    </div>
    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-3">
        <span class="text-muted text-sm">{{ t('consensus.card.visible') }}</span>
        <PButton :to="resultsTo" variant="soft" size="sm">{{
          t('consensus.card.results')
        }}</PButton>
      </div>
    </template>
  </PCard>
</template>
