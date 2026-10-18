<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import type {
  RosterDriver,
  RosterProposal,
  RosterSelection,
  RosterTeam,
} from '@/lib/publicData/rosterMapping'
import { rosterFlags } from '@/lib/publicData/rosterMapping'

/**
 * «Rellenar con datos públicos» review (M4 GP entry list, M8 season import and driver prefill).
 * Only proposes: «Aplicar» emits the selected rows and the parent decides what they change. The
 * parent owns the save. Loaded on demand (async component) so the public data layer stays lazy.
 */
const props = withDefaults(
  defineProps<{
    roster: RosterProposal | undefined
    loading?: boolean
    failed?: boolean
    /** Each driver row gets «Usar» and applies at once (driver form prefill). */
    single?: boolean
    showTeams?: boolean
    canSelect?: (kind: 'driver' | 'team', row: RosterDriver | RosterTeam) => boolean
    preselect?: (kind: 'driver' | 'team', row: RosterDriver | RosterTeam) => boolean
    applyLabel?: string
    busy?: boolean
    /** Shown under the list (GP entry list note, save warnings). */
    note?: string
  }>(),
  {
    loading: false,
    failed: false,
    single: false,
    showTeams: false,
    canSelect: () => true,
    preselect: () => false,
    applyLabel: '',
    busy: false,
    note: '',
  },
)
const emit = defineEmits<{
  apply: [selection: RosterSelection]
  retry: []
  close: []
}>()
const { t, locale } = useI18n()

const picked = ref(new Set<string>())
const keyOf = (kind: 'driver' | 'team', row: RosterDriver | RosterTeam) => `${kind}:${row.key}`

watch(
  () => props.roster,
  (r) => {
    if (!r) return
    picked.value = new Set([
      ...r.drivers
        .filter((d) => props.canSelect('driver', d) && props.preselect('driver', d))
        .map((d) => keyOf('driver', d)),
      ...(props.showTeams
        ? r.teams
            .filter((x) => props.canSelect('team', x) && props.preselect('team', x))
            .map((x) => keyOf('team', x))
        : []),
    ])
  },
  { immediate: true },
)

const toggle = (kind: 'driver' | 'team', row: RosterDriver | RosterTeam, on: boolean) => {
  const next = new Set(picked.value)
  if (on) next.add(keyOf(kind, row))
  else next.delete(keyOf(kind, row))
  picked.value = next
}
const isOn = (kind: 'driver' | 'team', row: RosterDriver | RosterTeam) =>
  picked.value.has(keyOf(kind, row))

const selection = computed<RosterSelection>(() => ({
  drivers: (props.roster?.drivers ?? []).filter((d) => isOn('driver', d)),
  teams: props.showTeams ? (props.roster?.teams ?? []).filter((x) => isOn('team', x)) : [],
}))

const flagText = (row: RosterDriver | RosterTeam, kind: 'driver' | 'team') => {
  if (kind === 'team') {
    return (row as RosterTeam).appId != null ? [t('publicRoster.teamExists')] : []
  }
  const d = row as RosterDriver
  const flags = rosterFlags(d).map((f) =>
    t(
      `publicRoster.flags.${f === 'unmatched' ? 'unmatched' : f === 'no-colour' ? 'noColour' : 'noTeam'}`,
    ),
  )
  if (d.appId != null) flags.unshift(t('publicRoster.driverExists'))
  if (d.number == null || d.color == null) flags.push(t('publicRoster.flags.noNumber'))
  return flags
}

const sourceLine = computed(() => {
  const r = props.roster
  if (!r) return ''
  return t('publicRoster.source', {
    source: r.sources.map((s) => t(`publicRoster.sources.${s}`)).join(' · '),
    time: new Date(r.fetchedAt).toLocaleString(locale.value),
  })
})
</script>

<template>
  <section
    :aria-label="t('publicRoster.title')"
    class="border-border bg-surface-muted flex flex-col gap-3 rounded-md border p-3 text-sm"
  >
    <p class="text-muted">{{ t('publicRoster.hint') }}</p>

    <p v-if="loading" role="status" class="text-muted">{{ t('publicRoster.loading') }}</p>

    <div v-else-if="failed" class="flex flex-wrap items-center gap-3">
      <p role="alert" class="text-err">{{ t('publicRoster.error') }}</p>
      <PButton variant="outline" size="sm" @click="emit('retry')">
        {{ t('publicRoster.retry') }}
      </PButton>
      <PButton variant="outline" size="sm" @click="emit('close')">
        {{ t('publicRoster.close') }}
      </PButton>
    </div>

    <template v-else-if="roster">
      <p class="text-muted text-xs">{{ sourceLine }}</p>
      <p v-if="!roster.sources.includes('openf1')" class="text-warn-fg">
        {{ t('publicRoster.noColourSource') }}
      </p>
      <p v-if="note" class="text-muted">{{ note }}</p>

      <h3 class="text-heading font-semibold">{{ t('publicRoster.drivers') }}</h3>
      <p v-if="!roster.drivers.length" class="text-muted">{{ t('publicRoster.empty') }}</p>
      <ul v-else class="flex flex-col gap-1">
        <li
          v-for="d in roster.drivers"
          :key="d.key"
          class="flex flex-wrap items-center gap-2"
          data-testid="roster-driver"
        >
          <PCheckbox
            v-if="!single"
            :model-value="isOn('driver', d)"
            :disabled="!canSelect('driver', d)"
            :label="`${d.number ?? '—'} · ${d.code ?? '???'} · ${d.firstname} ${d.lastname}${d.team ? ' · ' + d.team : ''}`"
            @update:model-value="(v: boolean) => toggle('driver', d, v)"
          />
          <template v-else>
            <span class="text-body">
              {{ d.number ?? '—' }} · {{ d.code ?? '???' }} · {{ d.firstname }} {{ d.lastname }}
              <span v-if="d.team" class="text-muted">· {{ d.team }}</span>
            </span>
            <PButton
              variant="outline"
              size="sm"
              @click="emit('apply', { drivers: [d], teams: [] })"
            >
              {{ t('publicRoster.use') }}
            </PButton>
          </template>
          <span
            v-if="d.color"
            class="inline-block h-[14px] w-1 rounded-sm"
            :style="{ background: d.color }"
            aria-hidden="true"
          />
          <span v-for="f in flagText(d, 'driver')" :key="f" class="text-warn-fg text-xs">{{
            f
          }}</span>
        </li>
      </ul>

      <template v-if="showTeams">
        <h3 class="text-heading font-semibold">{{ t('publicRoster.teams') }}</h3>
        <ul class="flex flex-col gap-1">
          <li v-for="x in roster.teams" :key="x.key" class="flex flex-wrap items-center gap-2">
            <PCheckbox
              :model-value="isOn('team', x)"
              :disabled="!canSelect('team', x)"
              :label="x.name"
              @update:model-value="(v: boolean) => toggle('team', x, v)"
            />
            <span
              v-if="x.color"
              class="inline-block h-[14px] w-1 rounded-sm"
              :style="{ background: x.color }"
              aria-hidden="true"
            />
            <span v-for="f in flagText(x, 'team')" :key="f" class="text-muted text-xs">{{
              f
            }}</span>
          </li>
        </ul>
      </template>

      <div v-if="roster.unmatchedApp.length" class="flex flex-col gap-1">
        <p class="text-warn-fg font-medium">{{ t('publicRoster.unmatchedApp') }}</p>
        <ul class="text-muted list-inside list-disc">
          <li v-for="u in roster.unmatchedApp" :key="u.id">{{ u.label }}</li>
        </ul>
      </div>

      <div v-if="!single" class="flex justify-end">
        <PButton
          :loading="busy"
          :disabled="!selection.drivers.length && !selection.teams.length"
          @click="emit('apply', selection)"
        >
          {{ applyLabel || t('publicRoster.apply') }}
        </PButton>
      </div>
    </template>
  </section>
</template>
