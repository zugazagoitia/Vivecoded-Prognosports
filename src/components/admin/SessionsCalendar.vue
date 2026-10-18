<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PField from '@/components/ui/PField.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import PSelect from '@/components/ui/PSelect.vue'
import { controlBase } from '@/components/ui/styles'
import {
  buildTimeline,
  closeMark,
  fromZonedInput,
  hasPrediction,
  predictedPositions,
  toZonedInput,
  usesInfo,
  defaultDuration,
} from '@/lib/adminSessions'
import { sessionLabel } from '@/lib/gp'
import type { RaceSession, RuleSet } from '@/api/schemas'
import {
  useAddSession,
  useCatalogSessions,
  useDeleteSession,
  useSaveSession,
} from '@/queries/admin'

/** M5 · «Calendario» tab: timeline of the weekend + panel of the selected session. */
const props = defineProps<{
  args: { comp: string; season: string; gp: number }
  sessions: RaceSession[]
  tz: string
  zoneName: string
  rulesets: RuleSet[]
  selectedId?: number
  adding: boolean
}>()
const emit = defineEmits<{ select: [id: number]; 'update:adding': [v: boolean] }>()
const { t } = useI18n()

const timeline = computed(() => buildTimeline(props.sessions, props.tz))
const selected = computed(() => props.sessions.find((s) => s.id === props.selectedId) ?? undefined)

const start = ref('')
/**
 * A public-calendar time waiting for its session to be selected (issue 202). It is used by the
 * next selection only, and only within a few seconds, so a select the parent ignores cannot
 * leave a stale time behind.
 */
const PENDING_MS = 5_000
const pendingFill = ref<{ id: number; iso: string; until: number } | null>(null)
watch(
  [selected, () => props.tz],
  () => {
    const p = pendingFill.value
    pendingFill.value = null
    if (p && p.id === selected.value?.id && Date.now() <= p.until) {
      start.value = toZonedInput(p.iso, props.tz)
    } else {
      start.value = toZonedInput(selected.value?.date, props.tz)
    }
  },
  { immediate: true },
)
/** «Usar hora» of the public calendar: pre-fills the start only; the panel's «Guardar» saves it. */
const PublicCalendarSessions = defineAsyncComponent(
  () => import('@/components/admin/PublicCalendarSessions.vue'),
)
function onPublicUse(use: { id: number; iso: string }) {
  if (selected.value?.id === use.id) {
    start.value = toZonedInput(use.iso, props.tz)
  } else {
    pendingFill.value = { ...use, until: Date.now() + PENDING_MS }
    emit('select', use.id)
  }
}
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', {
    timeZone: props.tz,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
    .format(Date.parse(iso))
    .replace('.', '')
const weekday = (iso: string) => dayLabel(iso).split(' ')[0] ?? ''
const dateOnly = (iso: string) => dayLabel(iso).split(' ').slice(1).join(' ')
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('es') + s.slice(1)

const args = computed(() => props.args)
const save = useSaveSession(args)
const del = useDeleteSession(args)
const addM = useAddSession(args)
const confirmDelete = ref(false)

function onSave() {
  const iso = fromZonedInput(start.value, props.tz)
  if (selected.value && iso) save.mutate({ session: selected.value.id, date: iso })
}
function onDelete() {
  if (selected.value) del.mutate(selected.value.id)
}

const catalog = useCatalogSessions()
const catalogOptions = computed(() =>
  (catalog.data.value ?? []).map((s) => ({
    value: s.id,
    label: sessionLabel(s).long || (s.name ?? String(s.id)),
  })),
)
const newSession = ref<number | string>('')
const newStart = ref('')
function onAdd() {
  const iso = fromZonedInput(newStart.value, props.tz)
  if (!newSession.value || !iso) return
  addM.mutate(
    { session: Number(newSession.value), date: iso },
    {
      onSuccess: () => {
        emit('update:adding', false)
        newSession.value = ''
        newStart.value = ''
      },
    },
  )
}

const predicted = computed(() =>
  selected.value ? predictedPositions(selected.value, props.rulesets) : undefined,
)
const uses = computed(() => usesInfo(selected.value?.uses))

const blockTone = (s: RaceSession) =>
  s.id === props.selectedId
    ? 'bg-primary text-on-primary border-brand-800'
    : hasPrediction(s)
      ? 'bg-tint text-tint-fg border-brand-300'
      : 'bg-surface-muted text-muted border-border'
</script>

<template>
  <div class="cal-lay">
    <PCard>
      <p class="text-muted mb-3 text-sm">{{ t('admin.sessions.calendar.hint') }}</p>
      <div
        role="group"
        :aria-label="t('admin.sessions.calendar.timeline')"
        class="min-w-0 overflow-x-auto"
      >
        <div class="min-w-[560px]">
          <div class="text-axis-txt relative mb-1 ml-[90px] h-5 text-[11px]">
            <span
              v-for="l in timeline.labels"
              :key="l.label + l.left"
              class="absolute -translate-x-1/2 tabular-nums"
              :style="{ left: `${l.left}%` }"
              >{{ l.label }}</span
            >
          </div>
          <div
            v-for="day in timeline.days"
            :key="day.key"
            class="border-border grid min-h-[72px] grid-cols-[90px_minmax(0,1fr)] border-t"
          >
            <div class="flex flex-col justify-center">
              <b class="text-heading text-sm">{{ cap(weekday(day.at)) }}</b>
              <span class="text-muted text-xs">{{ dateOnly(day.at) }}</span>
            </div>
            <div class="relative h-[72px]">
              <span
                v-for="l in timeline.labels"
                :key="l.label + l.left"
                class="bg-grid absolute top-0 h-full w-px"
                :style="{ left: `${l.left}%` }"
                aria-hidden="true"
              />
              <template v-for="b in day.blocks" :key="b.session.id">
                <span
                  v-if="b.close != null"
                  class="bg-err absolute top-1 h-16 w-0.5"
                  :style="{ left: `${b.close}%` }"
                  :title="t('admin.sessions.calendar.closeTitle')"
                />
                <button
                  type="button"
                  :aria-pressed="b.session.id === selectedId"
                  :aria-label="
                    t('admin.sessions.calendar.blockAria', {
                      name: sessionLabel(b.session).long,
                      day: cap(weekday(day.at)),
                      from: b.startLabel,
                      to: b.endLabel,
                      pred: t(
                        hasPrediction(b.session)
                          ? 'admin.sessions.calendar.withPred'
                          : 'admin.sessions.calendar.withoutPred',
                      ),
                    })
                  "
                  :class="[
                    'focus-visible:outline-focus-ring absolute top-2.5 flex h-[52px] cursor-pointer flex-col items-start justify-center overflow-hidden rounded-md border-2 px-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2',
                    blockTone(b.session),
                  ]"
                  :style="{ left: `${b.left}%`, width: `${b.width}%` }"
                  @click="emit('select', b.session.id)"
                >
                  <b class="max-w-full truncate">{{ sessionLabel(b.session).short }}</b>
                  <span class="tabular-nums">{{ b.startLabel }}–{{ b.endLabel }}</span>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
      <ul class="text-muted m-0 mt-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs">
        <li class="flex items-center gap-1.5">
          <span class="bg-tint border-brand-300 size-3 rounded-sm border-2" aria-hidden="true" />{{
            t('admin.sessions.calendar.legendPred')
          }}
        </li>
        <li class="flex items-center gap-1.5">
          <span
            class="bg-surface-muted border-border size-3 rounded-sm border"
            aria-hidden="true"
          />{{ t('admin.sessions.calendar.legendFree') }}
        </li>
        <li class="flex items-center gap-1.5">
          <span class="bg-err h-3 w-0.5" aria-hidden="true" />{{
            t('admin.sessions.calendar.legendClose')
          }}
        </li>
      </ul>
      <p class="text-muted mt-2 text-xs">{{ t('admin.sessions.calendar.durationNote') }}</p>
      <PublicCalendarSessions
        v-if="sessions.length"
        class="mt-4"
        :args="args"
        :sessions="sessions"
        @use="onPublicUse"
      />
    </PCard>

    <div class="flex min-w-0 flex-col gap-4">
      <PCard v-if="adding" :title="t('admin.sessions.add.title')">
        <form class="flex flex-col gap-3" @submit.prevent="onAdd">
          <PSelect
            v-model="newSession"
            :label="t('admin.sessions.add.session')"
            :options="catalogOptions"
            :placeholder="t('admin.sessions.add.sessionPlaceholder')"
          />
          <PField v-slot="{ id }" :label="t('admin.sessions.add.start', { zone: zoneName })">
            <input :id="id" v-model="newStart" type="datetime-local" :class="controlBase" />
          </PField>
          <div class="flex gap-2">
            <PButton
              type="submit"
              size="sm"
              :loading="addM.isPending.value"
              :disabled="!newSession || !newStart"
              >{{ t('admin.sessions.add.submit') }}</PButton
            >
            <PButton variant="outline" size="sm" @click="emit('update:adding', false)">{{
              t('admin.sessions.add.cancel')
            }}</PButton>
          </div>
        </form>
      </PCard>

      <PCard v-if="selected">
        <h2 class="t-header text-heading mb-3">{{ sessionLabel(selected).long }}</h2>
        <div class="flex flex-col gap-3">
          <dl class="m-0 flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <dt class="text-body text-xs font-bold tracking-wide uppercase">
                {{ t('admin.sessions.panel.code') }}
              </dt>
              <dd class="bg-surface-muted m-0 min-h-[38px] rounded-md px-3 py-2 text-sm">
                {{ selected.name ?? selected.code }}
              </dd>
            </div>
          </dl>
          <PField v-slot="{ id }" :label="t('admin.sessions.panel.start', { zone: zoneName })">
            <input :id="id" v-model="start" type="datetime-local" :class="controlBase" />
          </PField>
          <dl class="m-0 flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <dt class="text-body text-xs font-bold tracking-wide uppercase">
                {{ t('admin.sessions.panel.duration') }}
              </dt>
              <dd class="bg-surface-muted m-0 min-h-[38px] rounded-md px-3 py-2 text-sm">
                {{ t('admin.sessions.panel.minutes', { n: defaultDuration(selected) }) }}
              </dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-body text-xs font-bold tracking-wide uppercase">
                {{ t('admin.sessions.panel.close') }}
              </dt>
              <dd class="bg-surface-muted m-0 min-h-[38px] rounded-md px-3 py-2 text-sm">
                {{
                  hasPrediction(selected)
                    ? t('admin.sessions.panel.closeValue', { time: closeMark(selected.date, tz) })
                    : t('admin.sessions.panel.noPred')
                }}
              </dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-body text-xs font-bold tracking-wide uppercase">
                {{ t('admin.sessions.panel.predicts') }}
              </dt>
              <dd class="bg-surface-muted m-0 min-h-[38px] rounded-md px-3 py-2 text-sm">
                {{
                  hasPrediction(selected) && predicted != null
                    ? t('admin.sessions.panel.predictsValue', { n: predicted })
                    : t('admin.sessions.panel.none')
                }}
              </dd>
            </div>
          </dl>
          <p class="bg-info-tint text-info-fg rounded-sm px-2.5 py-2 text-sm" role="note">
            {{
              uses.communities > 0
                ? t('admin.sessions.panel.uses', { c: uses.communities }, uses.communities)
                : t('admin.sessions.panel.noUses')
            }}
          </p>
          <div class="flex flex-wrap gap-2">
            <PButton size="sm" :loading="save.isPending.value" @click="onSave">{{
              t('admin.sessions.panel.save')
            }}</PButton>
            <PButton
              variant="outline"
              size="sm"
              class="text-err border-err"
              @click="confirmDelete = true"
              >{{ t('admin.sessions.panel.delete') }}</PButton
            >
          </div>
        </div>
      </PCard>
      <p v-else-if="!adding" class="text-muted text-sm">{{ t('admin.sessions.panel.pick') }}</p>
    </div>

    <PrognoModal
      v-model:open="confirmDelete"
      destructive
      :title="t('admin.sessions.delete.title')"
      :confirm-label="t('admin.sessions.delete.confirm')"
      @confirm="onDelete"
    >
      <p v-if="selected">
        {{ t('admin.sessions.delete.body', { name: sessionLabel(selected).long }) }}
      </p>
      <p v-if="uses.communities > 0" class="text-warn-fg mt-2 font-semibold">
        {{ t('admin.sessions.delete.uses', { c: uses.communities }, uses.communities) }}
      </p>
    </PrognoModal>
  </div>
</template>

<style>
.cal-lay {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
@media (min-width: 1101px) {
  .cal-lay {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
}
</style>
