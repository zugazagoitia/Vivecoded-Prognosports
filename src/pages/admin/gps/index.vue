<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import Chip from '@/components/ui/Chip.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PInput from '@/components/ui/PInput.vue'
import PPagination from '@/components/ui/PPagination.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTag, { type TagColor } from '@/components/ui/PTag.vue'
import { iconFor } from '@/components/ui/icons'
import { useNow } from '@/composables/useNow'
import {
  adminGpPath,
  chipCounts,
  filterRows,
  gpAdminState,
  gpFormat,
  PREP_KEYS,
  prepDoneCount,
  prepStatus,
  prepTone,
  type GpChip,
  type GpListRow,
  type GpAdminState,
} from '@/lib/adminGp'
import { gpDate } from '@/lib/gps'
import { gpShortName } from '@/lib/gp'
import { useGpDriverCounts, useSeasonConstructors } from '@/queries/admin'
import { DEFAULT_COMPETITION, useCurrentSeason, useSeasonGps } from '@/queries/circuits'
import { useCompetitionSeasons } from '@/queries/gps'

/**
 * M2 · Grandes Premios (`/admin/gps`): list of a season with search, season selector, filter chips
 * and a 4-icon preparation column. The «Publicado/Borrador» visibility does not exist in the API;
 * results count as complete when the GP has calculated points (see `lib/adminGp`).
 */
definePage({ meta: { title: 'route.adminGps' } })

const PAGE_SIZE = 25
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const now = useNow(60_000)
const comp = DEFAULT_COMPETITION

const current = useCurrentSeason(comp)
const seasons = useCompetitionSeasons(comp)
const wanted = computed(() => {
  const v = route.query.temporada
  return typeof v === 'string' && v ? v : undefined
})
const seasonId = computed(
  () => wanted.value ?? (current.data.value ? String(current.data.value.id) : undefined),
)
const seasonOptions = computed(() => {
  const list = (seasons.data.value ?? (current.data.value ? [current.data.value] : [])).map(
    (s) => ({
      value: String(s.id),
      label: s.name ?? String(s.id),
    }),
  )
  return list
})
const seasonName = computed(
  () => seasonOptions.value.find((o) => o.value === seasonId.value)?.label ?? '',
)
function onSeason(v: string | number) {
  void router.replace({ query: { ...route.query, temporada: String(v) } })
  page.value = 1
}

const gps = useSeasonGps(comp, seasonId)
const constructors = useSeasonConstructors(seasonId)
const counts = useGpDriverCounts(comp, seasonId, () => gps.data.value ?? [])
const expected = computed(() =>
  constructors.data.value ? constructors.data.value.length * 2 : undefined,
)

const rows = computed<GpListRow[]>(() =>
  (gps.data.value ?? []).map((gp) => ({
    gp,
    state: gpAdminState(gp, now.value),
    prep: prepStatus(gp, { count: counts.value[gp.id], expected: expected.value }),
  })),
)
const stats = computed(() => chipCounts(rows.value))

const text = ref('')
const query = ref('')
const setQuery = useDebounceFn((v: string) => (query.value = v), 200)
watch(text, (v) => void setQuery(v))
const chip = ref<GpChip>('all')
const page = ref(1)
watch([query, chip], () => (page.value = 1))

const filtered = computed(() => filterRows(rows.value, query.value, chip.value))
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

const stateColor: Record<GpAdminState, TagColor> = {
  played: 'gray',
  live: 'warn',
  published: 'info',
  suspended: 'err',
}
const prepIcon = {
  sessions: 'schedule',
  drivers: 'groups',
  image: 'image',
  results: 'emoji_events',
} as const
const toneClass = { ok: 'text-ok', warn: 'text-warn', neutral: 'text-border-input' } as const

function shortDate(gp: Parameters<typeof gpDate>[0]): string {
  const at = gpDate(gp)
  if (at == null) return t('admin.gps.noDate')
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
    .format(at)
    .replace('.', '')
}
const prepLabel = (key: (typeof PREP_KEYS)[number], tone: keyof typeof toneClass) =>
  t(`admin.gps.prep.${tone === 'neutral' ? 'neutral' : tone === 'ok' ? 'ok' : 'pending'}`, {
    what: t(`admin.gps.prep.${key}`),
  })
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminHeader
      :title="t('admin.gps.title')"
      :subtitle="
        gps.data.value
          ? t(
              'admin.gps.subtitle',
              { year: seasonName, n: gps.data.value.length },
              gps.data.value.length,
            )
          : undefined
      "
    >
      <PButton to="/admin/gps/nuevo" :icon="iconFor('add')">{{ t('admin.gps.new') }}</PButton>
    </AdminHeader>

    <PCard :padded="false">
      <div class="border-border flex flex-wrap items-center gap-3 border-b p-4">
        <div class="min-w-[220px] flex-1">
          <PInput
            v-model="text"
            type="search"
            icon="magnifying-glass"
            :aria-label="t('admin.gps.search')"
            :placeholder="t('admin.gps.searchPlaceholder')"
          />
        </div>
        <div class="w-auto">
          <PSelect
            :model-value="seasonId ?? ''"
            :options="seasonOptions"
            :aria-label="t('admin.gps.season')"
            @update:model-value="onSeason"
          />
        </div>
        <div class="flex flex-wrap gap-2" role="group" :aria-label="t('admin.gps.chips.label')">
          <Chip
            v-for="c in ['all', 'inc', 'ok'] as const"
            :key="c"
            :model-value="chip === c"
            @update:model-value="chip = c"
          >
            {{ t(`admin.gps.chips.${c}`) }}
            <span class="text-muted tabular-nums">{{ stats[c] }}</span>
          </Chip>
        </div>
      </div>

      <div class="p-4">
        <ErrorState
          v-if="gps.isError.value"
          :what="t('admin.gps.error')"
          :error="gps.error.value"
          @retry="gps.refetch()"
        />
        <Skeleton v-else-if="gps.isLoading.value || !seasonId" variant="table" :rows="10" />
        <EmptyState v-else-if="!rows.length" :title="t('admin.gps.empty')" icon="flag">
          <PButton to="/admin/gps/nuevo" :icon="iconFor('add')">{{ t('admin.gps.new') }}</PButton>
        </EmptyState>
        <EmptyState v-else-if="!filtered.length" :title="t('admin.gps.noMatch')" />
        <AdminTable v-else :caption="t('admin.gps.table.caption')">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.gps.table.round') }}</th>
              <th scope="col">{{ t('admin.gps.table.gp') }}</th>
              <th scope="col">{{ t('admin.gps.table.date') }}</th>
              <th scope="col">{{ t('admin.gps.table.format') }}</th>
              <th scope="col">{{ t('admin.gps.table.prep') }}</th>
              <th scope="col">{{ t('admin.gps.table.state') }}</th>
              <th scope="col">
                <span class="sr-only">{{ t('admin.gps.table.actions') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in visible" :key="r.gp.id">
              <td>{{ r.gp.round ?? '—' }}</td>
              <td>
                <b class="text-heading">{{ t('admin.gps.gpOf', { name: gpShortName(r.gp) }) }}</b>
                <div class="text-muted text-xs">{{ r.gp.circuit?.name ?? '—' }}</div>
              </td>
              <td>{{ shortDate(r.gp) }}</td>
              <td>{{ t(`admin.gps.format.${gpFormat(r.gp)}`) }}</td>
              <td>
                <span
                  class="inline-flex gap-1.5"
                  role="img"
                  :aria-label="t('admin.gps.prep.aria', { k: prepDoneCount(r.prep) })"
                >
                  <span
                    v-for="(key, i) in PREP_KEYS"
                    :key="key"
                    :class="toneClass[prepTone(r.prep[i]!, key, r.state === 'played')]"
                    :title="prepLabel(key, prepTone(r.prep[i]!, key, r.state === 'played'))"
                  >
                    <PIcon :name="iconFor(prepIcon[key])" :size="20" />
                  </span>
                </span>
              </td>
              <td>
                <PTag :color="stateColor[r.state]">{{ t(`admin.gps.state.${r.state}`) }}</PTag>
              </td>
              <td class="r">
                <PButton
                  variant="ghost"
                  size="sm"
                  :to="adminGpPath(r.gp, { competition: comp, season: seasonId })"
                  :aria-label="t('admin.gps.editAria', { name: gpShortName(r.gp) })"
                >
                  {{ t('admin.gps.edit') }}
                </PButton>
              </td>
            </tr>
          </tbody>
        </AdminTable>
        <PPagination
          v-if="filtered.length > PAGE_SIZE"
          v-model="page"
          class="mt-4"
          :total="filtered.length"
          :per-page="PAGE_SIZE"
        />
      </div>

      <footer
        class="border-border text-muted flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-3 text-xs"
      >
        <span>{{ t('admin.gps.legend.title') }}</span>
        <span v-for="key in PREP_KEYS" :key="key" class="inline-flex items-center gap-1">
          <PIcon :name="iconFor(prepIcon[key])" :size="16" />
          {{ t(`admin.gps.legend.${key}`) }}
        </span>
        <span>{{ t('admin.gps.legend.colors') }}</span>
      </footer>
    </PCard>
  </div>
</template>
