<script setup lang="ts">
import { computed, defineAsyncComponent, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTabs from '@/components/ui/PTabs.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import { iconFor } from '@/components/ui/icons'
import { driverFullName, sortDrivers, tabFromQuery, teamColor, cssColor } from '@/lib/adminDrivers'
import type { RosterDriver, RosterSelection, RosterTeam } from '@/lib/publicData/rosterMapping'
import {
  useRemoveSeasonConstructor,
  useRemoveSeasonDriver,
  useSaveSeasonConstructor,
  useSaveSeasonDriver,
  useSeasonConstructors,
  useSeasonDriverTeams,
  useSeasonDrivers,
} from '@/queries/admin'
import { DEFAULT_COMPETITION, useCurrentSeason } from '@/queries/circuits'
import { usePublicRosterCatalogue } from '@/queries/publicRoster'
import { useCompetitionSeasons } from '@/queries/gps'

/**
 * M8 · Pilotos y equipos (`/admin/pilotos?tab=equipos`): season catalogue. The forms are not drawn
 * in the mock-up: modals with the fields the API takes (see `queries/admin.ts`). «Quitar» removes
 * the driver/team from the season after a confirmation (the global record stays); changing a
 * driver's team is por confirmar. The season is chosen with `?temporada=` (default: current).
 */
definePage({ meta: { title: 'route.adminDrivers' } })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const seasonQ = useCurrentSeason(DEFAULT_COMPETITION)
const seasons = useCompetitionSeasons(DEFAULT_COMPETITION)
const wanted = computed(() => {
  const v = route.query.temporada
  return typeof v === 'string' && v ? v : undefined
})
const seasonId = computed(() => wanted.value ?? seasonQ.data.value?.id)
const seasonOptions = computed(() =>
  (seasons.data.value ?? (seasonQ.data.value ? [seasonQ.data.value] : [])).map((s) => ({
    value: String(s.id),
    label: s.name ?? String(s.id),
  })),
)
const seasonName = computed(
  () =>
    seasonOptions.value.find((o) => o.value === String(seasonId.value))?.label ??
    seasonQ.data.value?.name ??
    '',
)
function onSeason(v: string | number) {
  void router.replace({ query: { ...route.query, temporada: String(v) } })
}
const driversQ = useSeasonDrivers(seasonId)
const teamsQ = useSeasonConstructors(seasonId)
const teamOfQ = useSeasonDriverTeams(DEFAULT_COMPETITION, seasonId)

// Loaded on demand: the public roster module and its review UI stay out of the eager bundle.
const PublicRosterFill = defineAsyncComponent(
  () => import('@/components/admin/PublicRosterFill.vue'),
)

const tab = computed(() => tabFromQuery(route.query.tab))
const tabs = [
  { value: 'pilotos', label: t('admin.drivers.tabs.pilotos') },
  { value: 'equipos', label: t('admin.drivers.tabs.equipos') },
]
const setTab = (v: string) =>
  void router.replace({
    query: { ...route.query, tab: v === 'equipos' ? 'equipos' : undefined },
  })

const drivers = computed(() =>
  sortDrivers(driversQ.data.value ?? []).map((d) => ({
    ...d,
    team: d.team ?? teamOfQ.data.value?.get(d.id) ?? null,
  })),
)
const teams = computed(() =>
  [...(teamsQ.data.value ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es')),
)

// --- forms ---------------------------------------------------------------------------------
type Kind = 'driver' | 'team'
const open = ref(false)
const kind = ref<Kind>('driver')
const editId = ref<number | undefined>()
const f = reactive({
  firstname: '',
  lastname: '',
  code: '',
  nationality: '',
  birth: '',
  number: '',
  color: '',
  name: '',
  car: '',
  fullname: '',
})
const touched = ref(false)
// «Rellenar con datos públicos»: the season catalogue is fetched when one of the two reviews opens.
const rosterOpen = ref(false)
const importOpen = ref(false)
const importing = ref(false)
const importFailed = ref(false)
const rosterSeason = computed(() => Number(seasonName.value) || undefined)
const catalogue = usePublicRosterCatalogue(rosterSeason, {
  drivers: () => driversQ.data.value ?? [],
  teams: () => teamsQ.data.value ?? [],
  enabled: () => rosterOpen.value || importOpen.value,
})
const saveDriver = useSaveSeasonDriver(seasonId)
const saveTeam = useSaveSeasonConstructor(seasonId)

function openDriver(d?: (typeof drivers.value)[number]) {
  kind.value = 'driver'
  rosterOpen.value = false
  editId.value = d?.id
  Object.assign(f, {
    firstname: d?.firstname ?? '',
    lastname: d?.lastname ?? '',
    code: d?.code ?? '',
    nationality: d?.nationality ?? '',
    birth: d?.birth?.slice(0, 10) ?? '',
    number: d?.number != null ? String(d.number) : '',
    color: cssColor(d?.color) ?? '',
  })
  touched.value = false
  open.value = true
}
function openTeam(c?: (typeof teams.value)[number]) {
  kind.value = 'team'
  rosterOpen.value = false
  editId.value = c?.id
  Object.assign(f, {
    name: c?.name ?? '',
    car: c?.carname ?? '',
    fullname: c?.longname ?? '',
    color: cssColor(c?.teamcolor) ?? '',
  })
  touched.value = false
  open.value = true
}

const req = (v: string) =>
  touched.value && !v.trim() ? t('admin.drivers.form.errors.required') : ''
const hexBad = computed(
  () => touched.value && f.color.trim() !== '' && !/^#?[0-9a-f]{6}$/i.test(f.color.trim()),
)
const numBad = computed(() => touched.value && !/^\d+$/.test(f.number.trim()))
const isNewDriver = computed(() => kind.value === 'driver' && editId.value == null)
const valid = computed(() => {
  if (kind.value === 'driver') {
    const person =
      editId.value != null || (f.firstname.trim() && f.lastname.trim() && f.code.trim())
    return !!person && /^\d+$/.test(f.number.trim()) && /^#?[0-9a-f]{6}$/i.test(f.color.trim())
  }
  return !!f.name.trim() && /^#?[0-9a-f]{6}$/i.test(f.color.trim())
})
const withHash = (c: string) => (c.trim().startsWith('#') ? c.trim() : `#${c.trim()}`)

/** Prefills the driver form from a proposal row. Nothing is saved until «Guardar». */
function onPrefill(sel: RosterSelection) {
  const d = sel.drivers[0]
  if (!d) return
  Object.assign(f, {
    firstname: d.firstname,
    lastname: d.lastname,
    code: d.code ?? f.code,
    nationality: d.nationality ?? '',
    birth: d.birth ?? '',
    number: d.number != null ? String(d.number) : f.number,
    color: d.color ?? f.color,
  })
  rosterOpen.value = false
}

const importable = (kind: 'driver' | 'team', row: RosterDriver | RosterTeam) =>
  kind === 'team'
    ? (row as RosterTeam).appId == null && (row as RosterTeam).color != null
    : (row as RosterDriver).number != null &&
      (row as RosterDriver).color != null &&
      ((row as RosterDriver).appId != null || (row as RosterDriver).code != null)

/**
 * Saves the reviewed selection. New teams and drivers are created; drivers already in the season
 * get their number and colour updated. Stops at the first error and keeps the review open.
 */
async function onImport(sel: RosterSelection) {
  importing.value = true
  importFailed.value = false
  try {
    for (const team of sel.teams) {
      if (team.appId != null || !team.color) continue
      await saveTeam.mutateAsync({
        name: team.name,
        car: '',
        fullname: team.name,
        teamcolor: withHash(team.color),
      })
    }
    for (const d of sel.drivers) {
      if (d.number == null || !d.color) continue
      await saveDriver.mutateAsync({
        id: d.appId ?? undefined,
        number: d.number,
        color: withHash(d.color),
        person:
          d.appId == null && d.code
            ? {
                firstname: d.firstname,
                lastname: d.lastname,
                code: d.code.toUpperCase(),
                ...(d.nationality ? { nationality: d.nationality } : {}),
                ...(d.birth ? { birth: `${d.birth}T00:00:00Z` } : {}),
              }
            : undefined,
      })
    }
    importOpen.value = false
  } catch {
    importFailed.value = true
  } finally {
    importing.value = false
  }
}

async function onSave() {
  touched.value = true
  if (!valid.value) return
  try {
    if (kind.value === 'driver') {
      await saveDriver.mutateAsync({
        id: editId.value,
        number: Number(f.number),
        color: withHash(f.color),
        person: isNewDriver.value
          ? {
              firstname: f.firstname.trim(),
              lastname: f.lastname.trim(),
              code: f.code.trim().toUpperCase(),
              ...(f.nationality.trim() ? { nationality: f.nationality.trim() } : {}),
              ...(f.birth ? { birth: `${f.birth}T00:00:00Z` } : {}),
            }
          : undefined,
      })
    } else {
      await saveTeam.mutateAsync({
        id: editId.value,
        name: f.name.trim(),
        car: f.car.trim(),
        fullname: f.fullname.trim(),
        teamcolor: withHash(f.color),
      })
    }
    open.value = false
  } catch {
    // The mutation toasted the error; the modal keeps what was typed.
  }
}
// --- removal -------------------------------------------------------------------------------
const removeDriver = useRemoveSeasonDriver(seasonId)
const removeTeam = useRemoveSeasonConstructor(seasonId)
const toRemove = ref<{ kind: Kind; id: number; name: string } | undefined>()
const confirmRemove = computed({
  get: () => toRemove.value != null,
  set: (v) => {
    if (!v) toRemove.value = undefined
  },
})
function onRemove() {
  const r = toRemove.value
  if (!r) return
  if (r.kind === 'driver') removeDriver.mutate(r.id)
  else removeTeam.mutate(r.id)
}
const loading = computed(
  () => seasonQ.isLoading.value || driversQ.isLoading.value || teamsQ.isLoading.value,
)
const failed = computed(
  () => seasonQ.isError.value || driversQ.isError.value || teamsQ.isError.value,
)
const retry = () => {
  void seasonQ.refetch()
  void driversQ.refetch()
  void teamsQ.refetch()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminHeader
      :title="t('admin.drivers.title')"
      :subtitle="seasonName ? t('admin.drivers.subtitle', { year: seasonName }) : undefined"
    >
      <div class="w-auto">
        <PSelect
          :model-value="seasonId != null ? String(seasonId) : ''"
          :options="seasonOptions"
          :aria-label="t('admin.drivers.season')"
          @update:model-value="onSeason"
        />
      </div>
      <PButton variant="outline" :icon="iconFor('add')" @click="openTeam()">{{
        t('admin.drivers.newTeam')
      }}</PButton>
      <PButton :icon="iconFor('add')" @click="openDriver()">{{
        t('admin.drivers.newDriver')
      }}</PButton>
      <PButton variant="soft" @click="importOpen = true">{{
        t('publicRoster.openSeason')
      }}</PButton>
    </AdminHeader>

    <PTabs
      :model-value="tab"
      :tabs="tabs"
      :label="t('admin.drivers.tabsLabel')"
      @update:model-value="setTab"
    >
      <template #pilotos>
        <PCard :padded="false">
          <div class="p-4">
            <ErrorState
              v-if="failed"
              :what="t('admin.drivers.error')"
              :error="driversQ.error.value"
              @retry="retry"
            />
            <Skeleton v-else-if="loading" variant="table" :rows="10" />
            <EmptyState
              v-else-if="!drivers.length"
              :title="t('admin.drivers.emptyDrivers')"
              icon="sports_motorsports"
            >
              <PButton :icon="iconFor('add')" @click="openDriver()">{{
                t('admin.drivers.newDriver')
              }}</PButton>
            </EmptyState>
            <AdminTable v-else :caption="t('admin.drivers.driversTable.caption')">
              <thead>
                <tr>
                  <th scope="col">{{ t('admin.drivers.driversTable.number') }}</th>
                  <th scope="col">{{ t('admin.drivers.driversTable.driver') }}</th>
                  <th scope="col">{{ t('admin.drivers.driversTable.code') }}</th>
                  <th scope="col">{{ t('admin.drivers.driversTable.team') }}</th>
                  <th scope="col">
                    <span class="sr-only">{{ t('admin.drivers.driversTable.actions') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in drivers" :key="d.id">
                  <td>{{ d.number ?? '—' }}</td>
                  <td>
                    <b class="text-heading">{{ driverFullName(d) }}</b>
                  </td>
                  <td>{{ d.code }}</td>
                  <td>
                    <span class="inline-flex items-center gap-2">
                      <span
                        v-if="d.team"
                        class="inline-block h-[18px] w-1 rounded-sm"
                        :style="{ background: teamColor(d) }"
                        aria-hidden="true"
                      />
                      {{ d.team?.name ?? '—' }}
                    </span>
                  </td>
                  <td class="r">
                    <PButton
                      variant="ghost"
                      size="sm"
                      :aria-label="
                        t('admin.drivers.driversTable.editAria', { name: driverFullName(d) })
                      "
                      @click="openDriver(d)"
                    >
                      {{ t('admin.drivers.edit') }}
                    </PButton>
                    <PButton
                      variant="ghost"
                      size="sm"
                      :aria-label="
                        t('admin.drivers.driversTable.removeAria', { name: driverFullName(d) })
                      "
                      @click="toRemove = { kind: 'driver', id: d.id, name: driverFullName(d) }"
                    >
                      {{ t('admin.drivers.remove') }}
                    </PButton>
                  </td>
                </tr>
              </tbody>
            </AdminTable>
          </div>
        </PCard>
      </template>
      <template #equipos>
        <PCard :padded="false">
          <div class="p-4">
            <ErrorState
              v-if="failed"
              :what="t('admin.drivers.error')"
              :error="teamsQ.error.value"
              @retry="retry"
            />
            <Skeleton v-else-if="loading" variant="table" :rows="6" />
            <EmptyState
              v-else-if="!teams.length"
              :title="t('admin.drivers.emptyTeams')"
              icon="groups"
            >
              <PButton :icon="iconFor('add')" @click="openTeam()">{{
                t('admin.drivers.newTeam')
              }}</PButton>
            </EmptyState>
            <AdminTable v-else :caption="t('admin.drivers.teamsTable.caption')">
              <thead>
                <tr>
                  <th scope="col">{{ t('admin.drivers.teamsTable.team') }}</th>
                  <th scope="col">{{ t('admin.drivers.teamsTable.car') }}</th>
                  <th scope="col">{{ t('admin.drivers.teamsTable.fullname') }}</th>
                  <th scope="col">
                    <span class="sr-only">{{ t('admin.drivers.driversTable.actions') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in teams" :key="c.id">
                  <td>
                    <span class="inline-flex items-center gap-2">
                      <span
                        class="inline-block h-[18px] w-1 rounded-sm"
                        :style="{ background: cssColor(c.teamcolor) }"
                        aria-hidden="true"
                      />
                      <b class="text-heading">{{ c.name }}</b>
                    </span>
                  </td>
                  <td>{{ c.carname ?? '—' }}</td>
                  <td>{{ c.longname ?? '—' }}</td>
                  <td class="r">
                    <PButton
                      variant="ghost"
                      size="sm"
                      :aria-label="t('admin.drivers.teamsTable.editAria', { name: c.name ?? '' })"
                      @click="openTeam(c)"
                    >
                      {{ t('admin.drivers.edit') }}
                    </PButton>
                    <PButton
                      variant="ghost"
                      size="sm"
                      :aria-label="t('admin.drivers.teamsTable.removeAria', { name: c.name ?? '' })"
                      @click="toRemove = { kind: 'team', id: c.id, name: c.name ?? '' }"
                    >
                      {{ t('admin.drivers.remove') }}
                    </PButton>
                  </td>
                </tr>
              </tbody>
            </AdminTable>
          </div>
        </PCard>
      </template>
    </PTabs>

    <PrognoModal
      v-model:open="confirmRemove"
      destructive
      :title="
        t(
          toRemove?.kind === 'team'
            ? 'admin.drivers.removeTeamTitle'
            : 'admin.drivers.removeDriverTitle',
        )
      "
      :description="
        t(
          toRemove?.kind === 'team'
            ? 'admin.drivers.removeTeamBody'
            : 'admin.drivers.removeDriverBody',
          {
            name: toRemove?.name ?? '',
            year: seasonName,
          },
        )
      "
      :confirm-label="t('admin.drivers.remove')"
      @confirm="onRemove"
    />

    <PrognoModal
      v-model:open="open"
      :title="
        kind === 'driver'
          ? t(editId != null ? 'admin.drivers.form.editDriver' : 'admin.drivers.form.newDriver')
          : t(editId != null ? 'admin.drivers.form.editTeam' : 'admin.drivers.form.newTeam')
      "
    >
      <form id="admin-roster-form" class="flex flex-col gap-3" novalidate @submit.prevent="onSave">
        <template v-if="kind === 'driver'">
          <template v-if="isNewDriver">
            <PInput
              v-model="f.firstname"
              :label="t('admin.drivers.form.firstname')"
              :error="req(f.firstname)"
            />
            <PInput
              v-model="f.lastname"
              :label="t('admin.drivers.form.lastname')"
              :error="req(f.lastname)"
            />
            <PInput
              v-model="f.code"
              maxlength="3"
              :label="t('admin.drivers.form.code')"
              :error="req(f.code)"
            />
            <PInput v-model="f.nationality" :label="t('admin.drivers.form.nationality')" />
            <PInput v-model="f.birth" type="date" :label="t('admin.drivers.form.birth')" />
          </template>
          <PInput
            v-model="f.number"
            inputmode="numeric"
            :label="t('admin.drivers.form.number')"
            :error="numBad ? t('admin.drivers.form.errors.number') : ''"
          />
          <PInput
            v-model="f.color"
            :label="t('admin.drivers.form.color')"
            :error="
              hexBad || (touched && !f.color.trim()) ? t('admin.drivers.form.errors.color') : ''
            "
            :help="t('admin.drivers.form.colorDriverHelp')"
          />
        </template>
        <template v-else>
          <PInput
            v-model="f.name"
            :disabled="editId != null"
            :label="t('admin.drivers.form.teamName')"
            :error="req(f.name)"
          />
          <PInput v-model="f.car" :label="t('admin.drivers.form.car')" />
          <PInput v-model="f.fullname" :label="t('admin.drivers.form.fullname')" />
          <PInput
            v-model="f.color"
            :label="t('admin.drivers.form.color')"
            :error="
              hexBad || (touched && !f.color.trim()) ? t('admin.drivers.form.errors.color') : ''
            "
          />
        </template>
      </form>
      <template v-if="kind === 'driver'">
        <PButton v-if="!rosterOpen" variant="outline" size="sm" @click="rosterOpen = true">
          {{ t('publicRoster.open') }}
        </PButton>
        <PublicRosterFill
          v-else
          single
          :roster="catalogue.data.value"
          :loading="catalogue.isFetching.value"
          :failed="catalogue.isError.value"
          @apply="onPrefill"
          @retry="() => void catalogue.refetch()"
          @close="rosterOpen = false"
        />
      </template>
      <template #footer>
        <PButton variant="outline" @click="open = false">{{
          t('admin.drivers.form.cancel')
        }}</PButton>
        <PButton
          :loading="saveDriver.isPending.value || saveTeam.isPending.value"
          @click="onSave"
          >{{ t('admin.drivers.form.save') }}</PButton
        >
      </template>
    </PrognoModal>

    <PrognoModal v-model:open="importOpen" :title="t('publicRoster.openSeason')">
      <PublicRosterFill
        v-if="importOpen"
        show-teams
        :roster="catalogue.data.value"
        :loading="catalogue.isFetching.value"
        :failed="catalogue.isError.value || importFailed"
        :can-select="(k, row) => importable(k, row)"
        :preselect="
          (k, row) =>
            importable(k, row) && (k === 'team' ? true : (row as RosterDriver).appId == null)
        "
        :apply-label="t('admin.drivers.form.save')"
        :busy="importing"
        :note="t('publicRoster.backendNote')"
        @apply="onImport"
        @retry="() => void catalogue.refetch()"
        @close="importOpen = false"
      />
    </PrognoModal>
  </div>
</template>
