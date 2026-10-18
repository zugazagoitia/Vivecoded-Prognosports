<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import type { Driver, RaceSession } from '@/api/schemas'
import { driverOption } from '@/lib/adminDrivers'
import { sessionKind } from '@/lib/publicData/mapping'
import {
  usePublicDataFill,
  type PublicDataMode,
  type PublicProposal,
} from '@/composables/usePublicDataFill'
import { useGpDetail } from '@/queries/gp'

/**
 * «Rellenar con datos públicos» (M5, grid and results tabs). Nothing is saved here: «Aplicar»
 * emits the proposal and the parent sets its local rows, which then count as unsaved changes.
 * Loaded on demand (async component) so the public data layer stays out of the eager bundle.
 */
const props = defineProps<{
  args: { comp: string; season: string; gp: number }
  mode: PublicDataMode
  session: Pick<RaceSession, 'code'> | undefined
  drivers: Driver[]
  /** Positions of the form. */
  slots: number
  /** Driver ids of the form, by position (index 0 = P1). */
  current: (number | null)[]
  /** Fastest lap of the form (results only). */
  currentFast?: number | null
}>()
const emit = defineEmits<{ apply: [proposal: PublicProposal] }>()
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
  resultKind: () => (props.session ? sessionKind(props.session) : null),
  drivers: () => props.drivers,
  slots: () => props.slots,
})

const label = (id: number | null) => {
  if (id == null) return t('admin.sessions.publicData.noDriver')
  const d = props.drivers.find((x) => x.id === id)
  return d ? driverOption(d) : t('admin.sessions.publicData.unknownDriver')
}

const changes = computed(() => {
  const p = fill.proposal.value
  if (!p) return []
  return p.driverIds.flatMap((to, i) => {
    const from = props.current[i] ?? null
    if (from === to) return []
    return [{ position: i + 1, from: label(from), to: label(to) }]
  })
})
const fastChange = computed(() => {
  const p = fill.proposal.value
  if (props.mode !== 'results' || !p) return null
  const from = props.currentFast ?? null
  return from === p.fastLap ? null : { from: label(from), to: label(p.fastLap) }
})
const unmatched = computed(() =>
  (fill.proposal.value?.unmatched ?? []).map((e) => ({
    position: e.position ?? null,
    name: [e.givenName, e.familyName].filter(Boolean).join(' ') || e.code || '',
  })),
)
const sourceLine = computed(() => {
  const p = fill.proposal.value
  if (!p) return ''
  return t('admin.sessions.publicData.source', {
    source: t(`admin.sessions.publicData.sources.${p.source}`),
    time: new Date(p.fetchedAt).toLocaleString(locale.value),
  })
})

function onApply() {
  if (!fill.proposal.value) return
  emit('apply', fill.proposal.value)
  fill.close()
}
</script>

<template>
  <div class="flex w-full flex-col gap-3">
    <div class="flex justify-end">
      <PButton variant="outline" size="sm" @click="fill.open()">
        {{ t('admin.sessions.publicData.open') }}
      </PButton>
    </div>

    <section
      v-if="fill.requested.value"
      :aria-label="t('admin.sessions.publicData.title')"
      class="border-border bg-surface-muted flex flex-col gap-3 rounded-md border p-3 text-sm"
    >
      <p class="text-muted">{{ t('admin.sessions.publicData.hint') }}</p>

      <p v-if="fill.state.value === 'loading'" role="status" class="text-muted">
        {{ t('admin.sessions.publicData.loading') }}
      </p>

      <div v-else-if="fill.state.value === 'error'" class="flex flex-wrap items-center gap-3">
        <p role="alert" class="text-err">{{ t('admin.sessions.publicData.error') }}</p>
        <PButton variant="outline" size="sm" @click="fill.retry()">
          {{ t('admin.sessions.publicData.retry') }}
        </PButton>
        <PButton variant="outline" size="sm" @click="fill.close()">
          {{ t('admin.sessions.publicData.close') }}
        </PButton>
      </div>

      <p v-else-if="fill.state.value === 'empty'" class="text-muted">
        {{ t('admin.sessions.publicData.empty') }}
      </p>

      <template v-else-if="fill.state.value === 'preview'">
        <p class="text-muted">{{ sourceLine }}</p>

        <div class="flex flex-col gap-1">
          <h3 class="text-heading font-semibold">{{ t('admin.sessions.publicData.changes') }}</h3>
          <p v-if="!changes.length && !fastChange" class="text-muted">
            {{ t('admin.sessions.publicData.noChanges') }}
          </p>
          <ul v-else class="flex flex-col gap-1 tabular-nums">
            <li v-for="c in changes" :key="c.position">
              {{
                t('admin.sessions.publicData.change', {
                  position: c.position,
                  from: c.from,
                  to: c.to,
                })
              }}
            </li>
            <li v-if="fastChange">
              {{
                t('admin.sessions.publicData.fastLap', { from: fastChange.from, to: fastChange.to })
              }}
            </li>
          </ul>
        </div>

        <div v-if="unmatched.length" class="flex flex-col gap-1">
          <h3 class="text-heading font-semibold">{{ t('admin.sessions.publicData.unmatched') }}</h3>
          <ul class="flex flex-col gap-1">
            <li v-for="(u, i) in unmatched" :key="i">
              {{
                t('admin.sessions.publicData.unmatchedItem', {
                  position: u.position ?? t('admin.sessions.publicData.unknownPosition'),
                  name: u.name || t('admin.sessions.publicData.unknownDriver'),
                })
              }}
            </li>
          </ul>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-muted text-xs">{{ t('admin.sessions.publicData.applyHint') }}</p>
          <div class="flex gap-2">
            <PButton variant="outline" size="sm" @click="fill.close()">
              {{ t('admin.sessions.publicData.close') }}
            </PButton>
            <PButton size="sm" @click="onApply">{{ t('admin.sessions.publicData.apply') }}</PButton>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
