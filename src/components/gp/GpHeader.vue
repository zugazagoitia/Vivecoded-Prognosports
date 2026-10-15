<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GrandPrix } from '@/api/schemas'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import PTitle from '@/components/ui/PTitle.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { gpPath, gpShortName, type WeekendState } from '@/lib/gp'
import type { TzMode } from './types'

/** Header of the GP: tags, title, place and dates, time-zone switch and previous/next GP. */
const props = defineProps<{
  gp: GrandPrix
  totalRounds: number
  sprint: boolean
  weekend: WeekendState
  /** The weekend is over but no session has official results: «Sin resultados», not «Disputado». */
  noResults?: boolean
  /** «Marina Bay Street Circuit · 9–11 de octubre de 2026» (desktop) or the short mobile one. */
  subtitle: string
  previous?: GrandPrix
  next?: GrandPrix
  /** Without a known circuit zone the switch is hidden. */
  canCircuitTz: boolean
  mobile?: boolean
}>()
const tz = defineModel<TzMode>('tz', { required: true })
const { t } = useI18n()

const name = computed(() => gpShortName(props.gp))
const options = computed(() => [
  { value: 'mine' as const, label: t('gp.tz.mine') },
  { value: 'circuit' as const, label: t('gp.tz.circuit') },
])
const label = (g: GrandPrix) => gpShortName(g)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex min-w-0 flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <PTag color="solid">{{
          mobile
            ? t('gp.roundShort', { n: gp.round })
            : t('gp.round', { n: gp.round, total: totalRounds })
        }}</PTag>
        <PTag v-if="sprint" color="info">{{
          mobile ? t('gp.sprintShort') : t('gp.withSprint')
        }}</PTag>
        <PTag v-if="weekend === 'live'" color="warn" :icon="mobile ? undefined : 'clock'">{{
          t('gp.weekend.live')
        }}</PTag>
        <PTag v-else-if="weekend === 'done'">{{
          noResults ? t('gp.weekend.noResults') : t('gp.weekend.done')
        }}</PTag>
      </div>
      <PTitle v-if="!mobile">{{ t('gp.title', { name }) }}</PTitle>
      <h1 v-else class="sr-only">{{ t('gp.title', { name }) }}</h1>
      <p class="text-muted" :class="mobile ? 'text-sm' : ''">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2" :class="mobile ? 'w-full' : ''">
      <SegmentedControl
        v-if="canCircuitTz"
        v-model="tz"
        :options="options"
        :label="t('gp.tz.label')"
        :class="mobile ? 'w-full [&>button]:flex-1 [&>button]:justify-center' : ''"
      />
      <template v-if="!mobile">
        <PButton
          v-if="previous"
          :to="gpPath(previous)"
          variant="outline"
          size="sm"
          icon="chevron-left"
          :aria-label="t('gp.prev', { name: label(previous) })"
        >
          {{ previous.code }}
        </PButton>
        <PButton
          v-if="next"
          :to="gpPath(next)"
          variant="outline"
          size="sm"
          :aria-label="t('gp.next', { name: label(next) })"
        >
          {{ next.code }}
          <PIcon name="chevron-right" :size="16" />
        </PButton>
      </template>
    </div>
  </div>
</template>
