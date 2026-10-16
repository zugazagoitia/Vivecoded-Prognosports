<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PTabs from '@/components/ui/PTabs.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import { iconFor } from '@/components/ui/icons'
import { driverFullName, sortDrivers, tabFromQuery, teamColor, cssColor } from '@/lib/adminDrivers'
import {
  useSaveSeasonConstructor,
  useSaveSeasonDriver,
  useSeasonConstructors,
  useSeasonDriverTeams,
  useSeasonDrivers,
} from '@/queries/admin'
import { DEFAULT_COMPETITION, useCurrentSeason } from '@/queries/circuits'

/**
 * M8 · Pilotos y equipos (`/admin/pilotos?tab=equipos`): season catalogue. The forms are not drawn
 * in the mock-up: modals with the fields the API takes (see `queries/admin.ts`). Deleting and
 * changing a driver's team are por confirmar.
 */
definePage({ meta: { title: 'route.adminDrivers' } })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const seasonQ = useCurrentSeason(DEFAULT_COMPETITION)
const seasonId = computed(() => seasonQ.data.value?.id)
const driversQ = useSeasonDrivers(seasonId)
const teamsQ = useSeasonConstructors(seasonId)
const teamOfQ = useSeasonDriverTeams(DEFAULT_COMPETITION, seasonId)

const tab = computed(() => tabFromQuery(route.query.tab))
const tabs = [
  { value: 'pilotos', label: t('admin.drivers.tabs.pilotos') },
  { value: 'equipos', label: t('admin.drivers.tabs.equipos') },
]
const setTab = (v: string) =>
  void router.replace({ query: v === 'equipos' ? { tab: 'equipos' } : {} })

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
const saveDriver = useSaveSeasonDriver(seasonId)
const saveTeam = useSaveSeasonConstructor(seasonId)

function openDriver(d?: (typeof drivers.value)[number]) {
  kind.value = 'driver'
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
      :subtitle="
        seasonQ.data.value
          ? t('admin.drivers.subtitle', { year: seasonQ.data.value.name })
          : undefined
      "
    >
      <PButton variant="outline" :icon="iconFor('add')" @click="openTeam()">{{
        t('admin.drivers.newTeam')
      }}</PButton>
      <PButton :icon="iconFor('add')" @click="openDriver()">{{
        t('admin.drivers.newDriver')
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
                  </td>
                </tr>
              </tbody>
            </AdminTable>
          </div>
        </PCard>
      </template>
    </PTabs>

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
            :help="t('admin.drivers.form.teamHelp')"
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
  </div>
</template>
