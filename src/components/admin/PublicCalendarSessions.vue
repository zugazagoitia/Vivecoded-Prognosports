<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import type { RaceSession } from '@/api/schemas'
import { useGpDetail } from '@/queries/gp'
import { usePublicCalendarProposal } from '@/queries/publicCalendar'

/**
 * «Horarios de sesiones (UTC)» from the public calendar (issue 202). «Usar hora» only pre-fills the
 * start of the session selected in the calendar; «Guardar» of that panel saves it.
 * Loaded on demand from SessionsCalendar.
 */
const props = defineProps<{
  args: { comp: string; season: string; gp: number }
  sessions: RaceSession[]
}>()
const emit = defineEmits<{ use: [use: { id: number; iso: string }] }>()
const { t } = useI18n()

const detail = useGpDetail(
  () => props.args.comp,
  () => props.args.season,
  () => String(props.args.gp),
)
// The season's year (the Jolpica/OpenF1 key), not the app's season id.
const season = computed(() => Number(detail.gp.value?.season?.name) || undefined)
const round = computed(() => detail.gp.value?.round ?? undefined)

const requested = ref(false)
const proposal = usePublicCalendarProposal(() =>
  requested.value && season.value != null && round.value != null
    ? { season: season.value, round: round.value }
    : undefined,
)

const utcLabel = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`

/** Each proposed session with the app session of the same code (if the app has one). */
const rows = computed(() =>
  (proposal.data.value?.sessions ?? []).map((s) => {
    const mine = props.sessions.find((x) => (x.code ?? '').toUpperCase() === s.code)
    const same = !!mine?.date && Date.parse(mine.date) === Date.parse(s.utc)
    return {
      code: s.code,
      utc: utcLabel(s.utc),
      current: mine
        ? mine.date
          ? utcLabel(mine.date)
          : t('publicCalendar.publicCalendar.sessions.unset')
        : null,
      conflict: s.conflictUtc ? utcLabel(s.conflictUtc) : null,
      id: mine?.id ?? null,
      canUse: !!mine && !same,
      iso: s.utc,
    }
  }),
)

const conflictCodes = computed(() =>
  (proposal.data.value?.warnings ?? []).flatMap((w) =>
    w.kind === 'time-conflict' ? [w.code] : [],
  ),
)

const sourceLine = computed(() => {
  const p = proposal.data.value
  if (!p) return ''
  return t('publicCalendar.publicCalendar.source', {
    sources: p.sources.map((s) => t(`publicCalendar.publicCalendar.sources.${s}`)).join(' + '),
    time: new Date(p.fetchedAt).toLocaleString(),
  })
})

function open() {
  requested.value = true
}
</script>

<template>
  <section
    :aria-label="t('publicCalendar.publicCalendar.sessions.title')"
    class="flex flex-col gap-3 text-sm"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-heading font-semibold">
        {{ t('publicCalendar.publicCalendar.sessions.title') }}
      </h3>
      <PButton v-if="!requested" variant="outline" size="sm" @click="open">
        {{ t('publicCalendar.publicCalendar.sessions.notLoaded') }}
      </PButton>
    </div>

    <template v-if="requested">
      <p class="text-muted">{{ t('publicCalendar.publicCalendar.sessions.hint') }}</p>

      <p v-if="proposal.isLoading.value" role="status" class="text-muted">
        {{ t('publicCalendar.publicCalendar.loading') }}
      </p>
      <div v-else-if="proposal.isError.value" class="flex flex-wrap items-center gap-3">
        <p role="alert" class="text-err">{{ t('publicCalendar.publicCalendar.error') }}</p>
        <PButton variant="outline" size="sm" @click="proposal.refetch()">
          {{ t('publicCalendar.publicCalendar.retry') }}
        </PButton>
      </div>

      <template v-else-if="proposal.data.value">
        <p class="text-muted text-xs">{{ sourceLine }}</p>

        <ul v-if="conflictCodes.length" class="text-err flex flex-col gap-1">
          <li v-for="code in conflictCodes" :key="code">
            {{ t('publicCalendar.publicCalendar.warnings.timeConflict', { code }) }}
          </li>
        </ul>

        <p v-if="!rows.length" class="text-muted">
          {{ t('publicCalendar.publicCalendar.sessions.empty') }}
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="r in rows"
            :key="r.code"
            class="border-border flex flex-wrap items-center justify-between gap-2 border-b pb-2"
          >
            <div class="flex flex-col gap-0.5 tabular-nums">
              <b class="text-heading">{{ r.code }}</b>
              <span>{{ t('publicCalendar.publicCalendar.sessions.proposed') }}: {{ r.utc }}</span>
              <span v-if="r.current" class="text-muted">
                {{ t('publicCalendar.publicCalendar.sessions.current') }}: {{ r.current }}
              </span>
              <span v-else class="text-muted">{{
                t('publicCalendar.publicCalendar.sessions.noAppSession')
              }}</span>
              <span v-if="r.conflict" class="text-muted">
                {{ t('publicCalendar.publicCalendar.sessions.conflict', { time: r.conflict }) }}
              </span>
            </div>
            <PButton
              v-if="r.canUse && r.id != null"
              variant="outline"
              size="sm"
              @click="emit('use', { id: r.id, iso: r.iso })"
            >
              {{ t('publicCalendar.publicCalendar.sessions.use') }}
            </PButton>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>
