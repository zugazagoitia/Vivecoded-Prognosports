<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import ConfirmLeaveDialog from '@/components/data/ConfirmLeaveDialog.vue'
import SaveBar from '@/components/data/SaveBar.vue'
import ValidationList from '@/components/data/ValidationList.vue'
import type { ValidationItem } from '@/components/data/types'
import AdminTable from '@/components/admin/AdminTable.vue'
import { ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PInput from '@/components/ui/PInput.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PSwitch from '@/components/ui/PSwitch.vue'
import PTag from '@/components/ui/PTag.vue'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import { iconFor } from '@/components/ui/icons'
import { gpImageUrl } from '@/api/gps'
import { useAdminCrumbs } from '@/composables/useAdminCrumbs'
import { useNow } from '@/composables/useNow'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import {
  adminGpPath,
  closeTimeLabel,
  gpSchema,
  groupResults,
  sectionStatus,
  sessionPhase,
  variantLabel,
} from '@/lib/adminGp'
import { buildSlots, cssColor, diffSlots } from '@/lib/adminDrivers'
import { predictedPositions } from '@/lib/adminSessions'
import { isSprintWeekend } from '@/lib/circuits'
import {
  circuitTimeZone,
  formatSessionWhen,
  gpPath,
  gpShortName,
  sessionLabel,
  sortedSessions,
  userTimeZone,
  utcOffsetLabel,
} from '@/lib/gp'
import {
  useAdminCircuits,
  useCreateGp,
  useDeleteGpImage,
  useGpDrivers,
  useRulesets,
  useSeasonConstructors,
  useSessionsHaveResults,
  useUpdateGp,
  useUploadGpImage,
} from '@/queries/admin'
import { DEFAULT_COMPETITION, useCurrentSeason } from '@/queries/circuits'
import { useGpDetail } from '@/queries/gp'
import { useSessionStore } from '@/stores/session'

/**
 * M3 · Ficha de un Gran Premio (alta y edición). Create: `POST /v2/gps/` + `POST
 * /v2/seasons/{season}/gps`; edit: `PUT /v2/gps/{id}` (name, code) and `PUT
 * /v2/gps/{comp}/{season}/{id}` (round, laps, circuit, variant), both verified against a local
 * backend (see `api/admin.ts`). Visibility and «sprint» are not API fields (por confirmar).
 */
const props = defineProps<{ competition?: string; season?: string; gpParam?: string }>()

const { t } = useI18n()
const router = useRouter()
const session = useSessionStore()
const now = useNow(60_000)
const isNew = computed(() => !props.gpParam)

const currentSeason = useCurrentSeason(DEFAULT_COMPETITION)
const comp = computed(() => props.competition ?? DEFAULT_COMPETITION)
const seasonId = computed(() => props.season ?? String(currentSeason.data.value?.id ?? ''))

const detail = useGpDetail(
  () => comp.value,
  () => seasonId.value || '0',
  () => props.gpParam ?? '',
)
const gp = computed(() => (isNew.value ? undefined : detail.gp.value))
const args = computed(() =>
  gp.value ? { comp: comp.value, season: seasonId.value, gp: gp.value.id } : undefined,
)
const gpId = computed(() => gp.value?.id)

const constructors = useSeasonConstructors(() => seasonId.value || undefined)
const drivers = useGpDrivers(comp, seasonId, gpId)
const prevDrivers = useGpDrivers(comp, seasonId, () => detail.previous.value?.id)
const circuits = useAdminCircuits()
const rulesets = useRulesets()
const sessions = computed(() => (gp.value ? sortedSessions(gp.value) : []))
const haveResults = useSessionsHaveResults(args, sessions)
const upload = useUploadGpImage(() => args.value!)
const removeImage = useDeleteGpImage(() => args.value!)
const create = useCreateGp(() => seasonId.value || undefined)
const update = useUpdateGp(() => args.value!)

useAdminCrumbs(() => [
  { label: isNew.value ? t('admin.gpEdit.titleNew') : gp.value ? gpShortName(gp.value) : '…' },
])

// --- form ----------------------------------------------------------------------------------

interface Form {
  name: string
  code: string
  round: string
  circuit: string
  variant: string
  laps: string
  sprint: boolean
  visible: boolean
}
const blank = (): Form => ({
  name: '',
  code: '',
  round: '',
  circuit: '',
  variant: '',
  laps: '',
  sprint: false,
  visible: true,
})
const form = reactive<Form>(blank())
const base = ref<Form>(blank())
const touched = ref(false)

function fromGp(): Form {
  const g = gp.value
  if (!g) return blank()
  return {
    name: g.name,
    code: g.code ?? '',
    round: g.round != null ? String(g.round) : '',
    circuit: g.circuit?.id != null ? String(g.circuit.id) : '',
    variant: g.variant?.id != null ? String(g.variant.id) : '',
    laps: g.laps != null ? String(g.laps) : '',
    sprint: isSprintWeekend(g),
    visible: !g.suspended,
  }
}
watch(
  gp,
  () => {
    base.value = fromGp()
    Object.assign(form, base.value)
  },
  { immediate: true },
)

const changed = computed(
  () => (Object.keys(form) as (keyof Form)[]).filter((k) => form[k] !== base.value[k]).length,
)
const dirty = computed(() => changed.value > 0)
const guard = useUnsavedChanges(dirty)

const parsed = computed(() => gpSchema.safeParse(form))
const errors = computed(() => {
  const out: Record<string, string> = {}
  if (!parsed.value.success && touched.value) {
    for (const i of parsed.value.error.issues) {
      const k = String(i.path[0])
      out[k] ??= t(
        String(i.message).startsWith('admin.') ? String(i.message) : `admin.gpEdit.errors.${k}`,
      )
    }
  }
  return out
})

const circuitOptions = computed(() =>
  (circuits.data.value ?? []).map((c) => ({ value: String(c.id), label: c.name ?? String(c.id) })),
)
const variantOptions = computed(() => {
  const c = circuits.data.value?.find((x) => String(x.id) === form.circuit)
  return (c?.variants ?? []).map((v) => ({ value: String(v.id), label: variantLabel(v) }))
})
function onCircuit(v: string | number) {
  form.circuit = String(v)
  form.variant = ''
}

function discard() {
  Object.assign(form, base.value)
  touched.value = false
}

async function save() {
  touched.value = true
  if (!parsed.value.success) return
  const d = parsed.value.data
  if (!isNew.value) {
    const changes: Record<string, string | number> = {}
    if (form.name !== base.value.name) changes.name = d.name
    if (form.code !== base.value.code) changes.code = d.code
    if (form.round !== base.value.round) changes.round = d.round
    if (form.laps !== base.value.laps) changes.laps = d.laps
    if (form.circuit !== base.value.circuit) changes.circuit = d.circuit
    if (form.variant !== base.value.variant) changes.variant = d.variant
    if (Object.keys(changes).length) await update.mutateAsync(changes).catch(() => undefined)
    if (!update.isError.value) base.value = { ...form }
    return
  }
  try {
    const created = await create.mutateAsync({
      name: d.name,
      code: d.code,
      round: d.round,
      circuit: d.circuit,
      variant: d.variant,
      laps: d.laps,
    })
    base.value = { ...form }
    await nextTick()
    void router.replace(
      adminGpPath({ id: created.id }, { competition: comp.value, season: seasonId.value }),
    )
  } catch {
    // The mutation already toasted the error and the form keeps what was typed.
  }
}

// --- derived -------------------------------------------------------------------------------

const tz = computed(() => userTimeZone(session.user?.timeZone))
const circuitTz = computed(() => circuitTimeZone(gp.value?.circuit))
const zoneLabel = computed(() => {
  const z = circuitTz.value ?? tz.value
  return `${circuitTz.value ? 'circuito' : 'tu hora'} ${utcOffsetLabel(z, now.value)}`
})
const expected = computed(() =>
  constructors.data.value ? constructors.data.value.length * 2 : undefined,
)
const counts = computed(() => ({ count: drivers.data.value?.length, expected: expected.value }))
const resultList = computed(() =>
  sessions.value.map((s) => ({
    name: sessionLabel(s).long,
    hasResults: haveResults.value[s.id] === true,
  })),
)
const groups = computed(() => groupResults(resultList.value))
const resultsKnown = computed(() => sessions.value.every((s) => haveResults.value[s.id] != null))
// A GP without sessions has no results yet (and nothing to publish): not «saved», not «published».
const resultsDone = computed(
  () => sessions.value.length > 0 && groups.value.pending.length === 0 && resultsKnown.value,
)
const published = computed(() => form.visible && sessions.value.length > 0)
const status = computed(() =>
  gp.value
    ? sectionStatus(
        gp.value,
        counts.value,
        sessions.value.length > 0 && groups.value.pending.length === 0,
      )
    : undefined,
)

const checks = computed<ValidationItem[]>(() => {
  if (!gp.value || !status.value) return []
  const s = status.value
  const n = sessions.value.length
  return [
    {
      state: s.datos === 'ok' ? 'ok' : 'warn',
      label: t(s.datos === 'ok' ? 'admin.gpEdit.status.data' : 'admin.gpEdit.status.dataWarn'),
    },
    s.sesiones === 'ok'
      ? { state: 'ok', label: t('admin.gpEdit.status.sessions', { n }, n) }
      : { state: 'warn', label: t('admin.gpEdit.status.sessionsWarn') },
    {
      state: s.pilotos === 'ok' ? 'ok' : 'warn',
      label: t('admin.gpEdit.status.drivers', {
        a: counts.value.count ?? 0,
        b: counts.value.expected ?? 0,
      }),
    },
    {
      state: s.imagen === 'ok' ? 'ok' : 'warn',
      label: t(s.imagen === 'ok' ? 'admin.gpEdit.status.image' : 'admin.gpEdit.status.imageWarn'),
    },
    resultsDone.value
      ? { state: 'ok', label: t('admin.gpEdit.status.resultsOk') }
      : sessions.value.length === 0
        ? { state: 'warn', label: t('admin.gpEdit.status.resultsNone') }
        : {
            state: 'warn',
            label: t(
              'admin.gpEdit.status.results',
              { n: groups.value.pending.length },
              groups.value.pending.length,
            ),
          },
  ]
})

const teamSummary = computed(() => {
  const teams = constructors.data.value ?? []
  const list = drivers.data.value ?? []
  return teams.map((team) => ({
    team,
    n: list.filter((d) => d.team?.id === team.id).length,
  }))
})
const teamLabel = (name: string | null | undefined, n: number) => `${name ?? ''} ${n}/2`
const driverChanges = computed(() => {
  const teams = constructors.data.value
  if (!teams || !drivers.data.value || !prevDrivers.data.value) return undefined
  return diffSlots(buildSlots(teams, prevDrivers.data.value), buildSlots(teams, drivers.data.value))
    .length
})
const prevName = computed(() => (detail.previous.value ? gpShortName(detail.previous.value) : ''))

const base0 = computed(() =>
  gp.value ? adminGpPath(gp.value, { competition: comp.value, season: seasonId.value }) : '',
)
const predicted = (s: (typeof sessions.value)[number]) =>
  predictedPositions(s, rulesets.data.value ?? [])

// --- index (anchors) -----------------------------------------------------------------------

const SECTIONS = ['datos', 'sesiones', 'pilotos', 'imagen', 'resultados'] as const
const selected = ref<(typeof SECTIONS)[number]>('datos')
function pick(s: (typeof SECTIONS)[number]) {
  selected.value = s
  document.getElementById(s)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}
const ring = (s: (typeof SECTIONS)[number]) =>
  selected.value === s ? 'shadow-[var(--card-shadow),0_0_0_2px_var(--color-focus-ring)]' : ''

// --- image ---------------------------------------------------------------------------------

const fileInput = ref<HTMLInputElement | null>(null)
const imageVersion = ref(0)
const imageError = ref('')
function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    imageError.value = t('admin.gpEdit.image.badType')
    return
  }
  imageError.value = ''
  upload.mutate(file, { onSuccess: () => (imageVersion.value = Date.now()) })
}
const imageSrc = computed(() =>
  gp.value?.hasPromoImage
    ? `${gpImageUrl(comp.value, seasonId.value, gp.value.id)}?v=${imageVersion.value}`
    : undefined,
)

const sectionClass = 'scroll-mt-20'
</script>

<template>
  <ErrorState
    v-if="!isNew && detail.isError.value"
    :what="t('admin.gpEdit.error')"
    :error="detail.error.value"
    @retry="detail.refetch()"
  />
  <section
    v-else-if="!isNew && detail.notFound.value"
    class="flex flex-col gap-3 py-10 text-center"
  >
    <h1 class="t-title text-heading">{{ t('admin.gpEdit.notFound') }}</h1>
    <PButton to="/admin/gps" class="mx-auto">{{ t('admin.gps.title') }}</PButton>
  </section>
  <div v-else class="flex flex-col gap-5">
    <AdminHeader
      :title="
        isNew || !gp
          ? t('admin.gpEdit.titleNew')
          : t('admin.gpEdit.title', { name: gpShortName(gp), year: gp.season?.name ?? '' })
      "
    >
      <template v-if="gp" #default>
        <PTag :color="published ? 'ok' : 'gray'">{{
          t(published ? 'admin.gpEdit.published' : 'admin.gpEdit.draft')
        }}</PTag>
        <PButton variant="outline" size="sm" :to="gpPath(gp)" :icon="iconFor('visibility')">
          {{ t('admin.gpEdit.viewAsUser') }}
        </PButton>
        <PButton
          v-if="detail.previous.value"
          variant="outline"
          size="sm"
          :to="adminGpPath(detail.previous.value as never, { competition: comp, season: seasonId })"
          :aria-label="t('admin.gpEdit.prevAria', { name: gpShortName(detail.previous.value) })"
          :icon="iconFor('chevron_left')"
        >
          {{ detail.previous.value.code }}
        </PButton>
        <PButton
          v-if="detail.next.value"
          variant="outline"
          size="sm"
          :to="adminGpPath(detail.next.value as never, { competition: comp, season: seasonId })"
          :aria-label="t('admin.gpEdit.nextAria', { name: gpShortName(detail.next.value) })"
        >
          {{ detail.next.value.code }}
          <PIcon :name="iconFor('chevron_right')" :size="16" />
        </PButton>
      </template>
    </AdminHeader>

    <Skeleton v-if="!isNew && (detail.isLoading.value || !gp)" variant="card" />
    <div v-else class="gp-lay">
      <nav
        :aria-label="t('admin.gpEdit.sections')"
        class="bg-surface ring-card-ring flex flex-col gap-0.5 self-start rounded-lg p-2 shadow-sm ring-1 min-[901px]:sticky min-[901px]:top-[72px]"
      >
        <a
          v-for="s in SECTIONS"
          :key="s"
          :href="`#${s}`"
          :aria-current="selected === s ? 'true' : undefined"
          :class="[
            'flex min-h-11 items-center gap-2 rounded-md px-2.5 py-2 text-sm no-underline hover:no-underline',
            selected === s
              ? 'bg-tint text-tint-fg font-semibold'
              : 'text-body hover:bg-surface-hover',
          ]"
          @click.prevent="pick(s)"
        >
          <span class="flex-1">{{ t(`admin.gpEdit.sectionNames.${s}`) }}</span>
          <span
            v-if="status && !isNew"
            :class="[
              'flex size-5 items-center justify-center rounded-full text-xs font-bold',
              status[s] === 'ok' ? 'bg-ok-tint text-ok-fg' : 'bg-warn-tint text-warn-fg',
            ]"
          >
            {{ status[s] === 'ok' ? '✓' : '!'
            }}<span class="sr-only"> {{ t(`admin.gpEdit.badge.${status[s]}`) }}</span>
          </span>
        </a>
      </nav>

      <div class="flex min-w-0 flex-col gap-5">
        <PCard v-if="!isNew">
          <div class="flex flex-wrap justify-between gap-5">
            <div class="flex flex-col gap-2">
              <b class="t-header text-heading">{{ t('admin.gpEdit.status.title') }}</b>
              <ValidationList :items="checks" />
            </div>
            <div>
              <PSwitch v-model="form.visible" :label="t('admin.gpEdit.visible')" disabled />
              <p class="text-muted max-w-60 text-xs">{{ t('admin.gpEdit.visibleHelp') }}</p>
            </div>
          </div>
        </PCard>

        <PCard id="datos" :class="[sectionClass, ring('datos')]">
          <h2 class="t-header text-heading mb-4">{{ t('admin.gpEdit.data.title') }}</h2>
          <form class="grid grid-cols-6 gap-3.5" novalidate @submit.prevent="save">
            <div class="col-span-6 md:col-span-4">
              <PInput
                v-model="form.name"
                :label="t('admin.gpEdit.data.name')"
                :error="errors.name"
              />
            </div>
            <div class="col-span-3 md:col-span-1">
              <PInput
                v-model="form.code"
                :label="t('admin.gpEdit.data.code')"
                maxlength="3"
                :error="errors.code"
              />
            </div>
            <div class="col-span-3 md:col-span-1">
              <PInput
                v-model="form.round"
                inputmode="numeric"
                :label="t('admin.gpEdit.data.round')"
                :error="errors.round"
              />
            </div>
            <div class="col-span-6 md:col-span-3">
              <PSelect
                :model-value="form.circuit"
                :label="t('admin.gpEdit.data.circuit')"
                :options="circuitOptions"
                :placeholder="t('admin.gpEdit.data.circuitPlaceholder')"
                :error="errors.circuit"
                @update:model-value="onCircuit"
              />
            </div>
            <div class="col-span-6 md:col-span-2">
              <PSelect
                v-model="form.variant"
                :label="t('admin.gpEdit.data.variant')"
                :options="variantOptions"
                :placeholder="t('admin.gpEdit.data.variantPlaceholder')"
                :error="errors.variant"
              />
            </div>
            <div class="col-span-6 md:col-span-1">
              <PInput
                v-model="form.laps"
                inputmode="numeric"
                :label="t('admin.gpEdit.data.laps')"
                :error="errors.laps"
              />
            </div>
            <div class="col-span-6">
              <PCheckbox
                v-model="form.sprint"
                :label="t('admin.gpEdit.data.sprint')"
                :help="t('admin.gpEdit.data.sprintHelp')"
                disabled
              />
            </div>
          </form>
        </PCard>

        <template v-if="gp && !isNew">
          <PCard id="sesiones" :class="[sectionClass, ring('sesiones')]">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 class="t-header text-heading">{{ t('admin.gpEdit.sessions.title') }}</h2>
              <div class="flex flex-wrap items-center gap-3">
                <RouterLink :to="`${base0}/sesiones/calendario`" class="text-link text-sm">{{
                  t('admin.gpEdit.sessions.timeline')
                }}</RouterLink>
                <PButton
                  variant="soft"
                  size="sm"
                  :to="`${base0}/sesiones/calendario?nueva=1`"
                  :icon="iconFor('add')"
                  >{{ t('admin.gpEdit.sessions.add') }}</PButton
                >
              </div>
            </div>
            <p v-if="!sessions.length" class="text-muted text-sm">
              {{ t('admin.gpEdit.sessions.empty') }}
            </p>
            <AdminTable v-else :caption="t('admin.gpEdit.sessions.caption')">
              <thead>
                <tr>
                  <th scope="col">{{ t('admin.gpEdit.sessions.session') }}</th>
                  <th scope="col">{{ t('admin.gpEdit.sessions.code') }}</th>
                  <th scope="col">{{ t('admin.gpEdit.sessions.start', { zone: zoneLabel }) }}</th>
                  <th scope="col">{{ t('admin.gpEdit.sessions.close') }}</th>
                  <th scope="col" class="r">{{ t('admin.gpEdit.sessions.drivers') }}</th>
                  <th scope="col">{{ t('admin.gpEdit.sessions.state') }}</th>
                  <th scope="col">
                    <span class="sr-only">{{ t('admin.gps.table.actions') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in sessions" :key="s.id">
                  <td>
                    <b class="text-heading">{{ sessionLabel(s).long }}</b>
                  </td>
                  <td class="text-muted">{{ s.name ?? s.code }}</td>
                  <td>{{ formatSessionWhen(s.date, circuitTz ?? tz) }}</td>
                  <td>{{ closeTimeLabel(s.date, circuitTz ?? tz) }}</td>
                  <td class="r">{{ predicted(s) ?? '—' }}</td>
                  <td>
                    <PTag :color="sessionPhase(s, now).phase === 'open' ? 'info' : 'gray'">{{
                      t(`admin.gpEdit.sessions.${sessionPhase(s, now).phase}`)
                    }}</PTag>
                  </td>
                  <td class="r">
                    <PButton
                      variant="ghost"
                      size="sm"
                      :to="`${base0}/sesiones/calendario?sesion=${s.id}`"
                      :aria-label="
                        t(
                          sessionPhase(s, now).action === 'view'
                            ? 'admin.gpEdit.sessions.viewAria'
                            : 'admin.gpEdit.sessions.editAria',
                          { name: sessionLabel(s).long },
                        )
                      "
                    >
                      {{ t(`admin.gpEdit.sessions.${sessionPhase(s, now).action}`) }}
                    </PButton>
                  </td>
                </tr>
              </tbody>
            </AdminTable>
          </PCard>

          <PCard id="pilotos" :class="[sectionClass, ring('pilotos')]">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 flex-col gap-2">
                <h2 class="t-header text-heading">{{ t('admin.gpEdit.drivers.title') }}</h2>
                <Skeleton v-if="drivers.isLoading.value" variant="line" />
                <p v-else-if="!drivers.data.value?.length" class="text-sm">
                  {{ t('admin.gpEdit.drivers.empty') }}
                </p>
                <p v-else class="text-sm">
                  {{
                    t(
                      'admin.gpEdit.drivers.summary',
                      {
                        n: drivers.data.value.length,
                        e: teamSummary.filter((x) => x.n > 0).length,
                      },
                      drivers.data.value.length,
                    )
                  }}
                  <template v-if="driverChanges != null && prevName">
                    ·
                    {{
                      driverChanges === 0
                        ? t('admin.gpEdit.drivers.same', { gp: prevName })
                        : t(
                            'admin.gpEdit.drivers.changes',
                            { k: driverChanges, gp: prevName },
                            driverChanges,
                          )
                    }}
                  </template>
                </p>
                <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
                  <li v-for="x in teamSummary" :key="x.team.id">
                    <PTag color="gray" :pill="false">
                      <span
                        class="inline-block h-3.5 w-1 rounded-sm"
                        :style="{ background: cssColor(x.team.teamcolor) }"
                        aria-hidden="true"
                      />
                      {{ teamLabel(x.team.name, x.n) }}
                    </PTag>
                  </li>
                </ul>
              </div>
              <PButton :to="`${base0}/pilotos`">{{ t('admin.gpEdit.drivers.edit') }}</PButton>
            </div>
          </PCard>

          <PCard id="imagen" :class="[sectionClass, ring('imagen')]">
            <div class="flex flex-wrap items-center gap-4">
              <img
                v-if="imageSrc"
                :src="imageSrc"
                :alt="t('admin.gpEdit.image.alt', { name: gpShortName(gp) })"
                width="220"
                height="124"
                class="h-[124px] w-[220px] rounded-lg object-cover"
              />
              <div
                v-else
                class="from-brand-800 to-brand-900 h-[124px] w-[220px] rounded-lg bg-gradient-to-br"
                aria-hidden="true"
              />
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <h2 class="t-header text-heading">{{ t('admin.gpEdit.image.title') }}</h2>
                <p class="text-muted text-sm">{{ t('admin.gpEdit.image.text') }}</p>
                <p v-if="imageError" role="alert" class="text-err text-xs">{{ imageError }}</p>
                <div class="flex flex-wrap gap-2">
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="sr-only"
                    tabindex="-1"
                    aria-hidden="true"
                    @change="onFile"
                  />
                  <PButton
                    variant="outline"
                    :loading="upload.isPending.value"
                    @click="fileInput?.click()"
                  >
                    {{
                      t(
                        gp.hasPromoImage
                          ? 'admin.gpEdit.image.change'
                          : 'admin.gpEdit.image.upload',
                      )
                    }}
                  </PButton>
                  <PButton
                    v-if="gp.hasPromoImage"
                    variant="ghost"
                    :loading="removeImage.isPending.value"
                    @click="removeImage.mutate()"
                  >
                    {{ t('admin.gpEdit.image.remove') }}
                  </PButton>
                </div>
              </div>
            </div>
          </PCard>

          <PCard id="resultados" :class="[sectionClass, ring('resultados')]">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 class="t-header text-heading">{{ t('admin.gpEdit.results.title') }}</h2>
              <PButton variant="soft" size="sm" :to="`${base0}/sesiones/resultados`">{{
                t('admin.gpEdit.results.enter')
              }}</PButton>
            </div>
            <p v-if="!resultsKnown" class="text-muted text-sm">
              {{ t('admin.gpEdit.results.unknown') }}
            </p>
            <ul v-else class="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              <li
                v-if="groups.saved.length"
                class="flex flex-wrap items-center justify-between gap-2"
              >
                <span>{{ groups.saved.join(' · ') }}</span>
                <PTag color="ok">{{ t('admin.gpEdit.results.saved') }}</PTag>
              </li>
              <li
                v-if="groups.pending.length"
                class="flex flex-wrap items-center justify-between gap-2"
              >
                <span>{{ groups.pending.join(' · ') }}</span>
                <PTag color="warn">{{ t('admin.gpEdit.results.pending') }}</PTag>
              </li>
            </ul>
          </PCard>
        </template>
        <PCard v-else>
          <p class="text-muted text-sm">{{ t('admin.gpEdit.newHint') }}</p>
        </PCard>

        <SaveBar
          :count="changed"
          position="static"
          :saving="create.isPending.value || update.isPending.value"
          @save="save"
          @discard="discard"
        />
      </div>
    </div>
    <ConfirmLeaveDialog :open="guard.open.value" @stay="guard.stay" @leave="guard.leave" />
  </div>
</template>

<style>
.gp-lay {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
@media (min-width: 901px) {
  .gp-lay {
    grid-template-columns: 200px minmax(0, 1fr);
  }
}
</style>
