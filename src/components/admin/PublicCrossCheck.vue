<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import type { Driver, RaceSession } from '@/api/schemas'
import { usePublicDataFill, type PublicDataMode } from '@/composables/usePublicDataFill'
import { crossCheckDiff } from '@/lib/publicData/crossCheck'
import { sessionKind as sessionKindOf } from '@/lib/publicData/mapping'
import { useGpDetail } from '@/queries/gp'

/**
 * «Comprobación cruzada» (issue 205): after saving results or a grid, compares the saved positions with
 * the public source and warns. Mounted with a new `key` per save, so the public source is asked
 * only then. It never changes data: a source failure just says so.
 */
const props = defineProps<{
  args: { comp: string; season: string; gp: number }
  mode: PublicDataMode
  session: Pick<RaceSession, 'code'> | undefined
  drivers: Driver[]
  slots: number
  /** Driver ids as saved, by position (index 0 = P1). */
  saved: (number | null)[]
}>()
const { t, locale } = useI18n()

const detail = useGpDetail(
  () => props.args.comp,
  () => props.args.season,
  () => String(props.args.gp),
)
const season = computed(() => Number(detail.gp.value?.season?.name) || undefined)
const round = computed(() => detail.gp.value?.round ?? undefined)

const fill = usePublicDataFill({
  mode: props.mode,
  season,
  round,
  resultKind: () => (props.session ? sessionKindOf(props.session) : null),
  drivers: () => props.drivers,
  slots: () => props.slots,
})
fill.open()

const diff = computed(() => {
  const p = fill.proposal.value
  return p ? crossCheckDiff(props.saved, p.driverIds) : null
})
const sourceName = computed(() =>
  fill.proposal.value
    ? t(`publicCrossCheck.publicCrossCheck.sources.${fill.proposal.value.source}`)
    : '',
)
const fetchedAt = computed(() =>
  fill.proposal.value ? new Date(fill.proposal.value.fetchedAt).toLocaleString(locale.value) : '',
)
</script>

<template>
  <div class="flex flex-col gap-2" role="status">
    <p v-if="fill.state.value === 'loading'" class="text-muted text-sm">
      {{ t('publicCrossCheck.publicCrossCheck.checking') }}
    </p>
    <p v-else-if="fill.state.value === 'error'" class="text-muted text-sm">
      {{ t('publicCrossCheck.publicCrossCheck.sourceError') }}
    </p>
    <p v-else-if="fill.state.value === 'empty'" class="text-muted text-sm">
      {{ t('publicCrossCheck.publicCrossCheck.noSource') }}
    </p>
    <template v-else-if="fill.state.value === 'preview' && diff != null">
      <PrognoAlert
        v-if="diff > 0"
        variant="warn"
        :title="t('publicCrossCheck.publicCrossCheck.diff', { n: diff })"
      />
      <p v-if="diff > 0" class="text-muted text-xs">
        {{ t('publicCrossCheck.publicCrossCheck.diffHint', { source: sourceName }) }}
      </p>
      <PrognoAlert v-else variant="ok" :title="t('publicCrossCheck.publicCrossCheck.match')" />
      <p class="text-muted text-xs">
        {{ t('publicCrossCheck.publicCrossCheck.source', { source: sourceName }) }} ·
        {{ fetchedAt }}
      </p>
    </template>
  </div>
</template>
