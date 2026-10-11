<script setup lang="ts">
import { useField, useForm } from 'vee-validate'
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api'
import CommunityPreview from '@/components/communities/CommunityPreview.vue'
import OptionCards from '@/components/communities/OptionCards.vue'
import RuleSetTable from '@/components/communities/RuleSetTable.vue'
import ConfirmLeaveDialog from '@/components/data/ConfirmLeaveDialog.vue'
import { ErrorState } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTextarea from '@/components/ui/PTextarea.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { focusRing } from '@/components/ui/styles'
import { useToast } from '@/composables/useToast'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import {
  NAME_MAX,
  communityFormSchema,
  defaultPoints,
  maxTheoretical,
  pointsSchema,
  ruleSetOptionLabel,
  summarizeRuleSet,
  validateImage,
  type Column,
  type FormMessages,
  type CommunityFormValues,
  type PointsGrid,
} from '@/lib/createCommunity'
import {
  useCompetitionSeasons,
  useCompetitions,
  useCreateCommunity,
  useCurrentSeasonId,
  useRulesets,
} from '@/queries/createCommunity'
import { useSessionStore } from '@/stores/session'
import { toTypedSchema } from '@/lib/zod-form'

definePage({
  meta: { layout: 'app', title: 'route.createCommunity', guards: ['auth', 'verified'] },
})

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const session = useSessionStore()

const schema = communityFormSchema({
  nameRequired: t('createCommunity.name.required'),
  nameMax: t('createCommunity.name.max'),
  required: t('createCommunity.competition.required'),
  rulesName: t('createCommunity.rules.nameRequired'),
  points: t('createCommunity.rules.points'),
})

const { handleSubmit, submitCount } = useForm<CommunityFormValues>({
  validationSchema: toTypedSchema(schema),
  initialValues: {
    name: '',
    description: '',
    access: 'closed',
    competition: '',
    season: '',
    rulesMode: 'existing',
    rulesetId: '',
    rulesName: '',
    points: defaultPoints(),
  },
})
const name = useField<string>('name')
const description = useField<string>('description')
const access = useField<'open' | 'closed'>('access')
const competition = useField<string>('competition')
const season = useField<string>('season')
const rulesMode = useField<'existing' | 'new'>('rulesMode')
const rulesetId = useField<string>('rulesetId')
const rulesName = useField<string>('rulesName')
const points = useField<PointsGrid>('points')

/** Errors show once the field was left or a submit was tried. */
const shown = (f: { meta: { touched: boolean }; errorMessage: { value?: string } }) =>
  f.meta.touched || submitCount.value > 0 ? f.errorMessage.value : undefined
const nameError = computed(() => shown(name))
const rulesetError = computed(() =>
  submitCount.value > 0 ? rulesetId.errorMessage.value : undefined,
)
const rulesNameError = computed(() => shown(rulesName))
const pointsEdited = ref(false)
const pointsMessages = t('createCommunity.rules.points')
const pointErrors = computed(() => {
  const out: Record<string, string> = {}
  if (rulesMode.value.value !== 'new' || (submitCount.value === 0 && !pointsEdited.value)) {
    return out
  }
  // Cell errors are not form fields, so they are computed here with the same schema.
  const res = pointsSchema({ points: pointsMessages } as FormMessages).safeParse(points.value.value)
  if (!res.success) {
    for (const issue of res.error.issues) out[issue.path.join('.')] = issue.message
  }
  return out
})
const firstPointError = computed(() => Object.values(pointErrors.value)[0])

// --- Competition and season -------------------------------------------------------------------
const competitions = useCompetitions()
const seasons = useCompetitionSeasons(() => competition.value.value)
const currentSeason = useCurrentSeasonId(() => competition.value.value)

watch(
  () => competitions.data.value,
  (list) => {
    if (list?.length && !competition.value.value) competition.setValue(String(list[0]!.id))
  },
  { immediate: true },
)
// A competition change resets the season; the current one (or the last listed) is preselected.
watch(competition.value, () => season.setValue(''))
watch(
  [() => seasons.data.value, () => currentSeason.data.value, () => currentSeason.isLoading.value],
  ([list, current, loading]) => {
    if (season.value.value || !list?.length || loading) return
    // The season in progress, else the newest one.
    const newest = list.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a))
    const pick = list.find((s) => String(s.id) === String(current?.id)) ?? newest
    season.setValue(String(pick.id))
  },
  { immediate: true },
)
const competitionOptions = computed(() =>
  (competitions.data.value ?? []).map((c) => ({
    value: String(c.id),
    label: c.fullname ?? c.name ?? c.code ?? String(c.id),
  })),
)
const seasonOptions = computed(() =>
  (seasons.data.value ?? []).map((s) => {
    const label = s.name ?? String(s.id)
    const isCurrent = currentSeason.data.value != null && s.id === currentSeason.data.value.id
    return {
      value: String(s.id),
      label: isCurrent ? t('createCommunity.competition.current', { name: label }) : label,
    }
  }),
)
const competitionLabel = computed(
  () => competitionOptions.value.find((o) => o.value === competition.value.value)?.label,
)
const seasonLabel = computed(() => {
  const s = seasons.data.value?.find((x) => String(x.id) === season.value.value)
  return s ? (s.name ?? String(s.id)) : undefined
})
const catalogLoading = computed(() => competitions.isLoading.value || seasons.isLoading.value)

// --- Rules ------------------------------------------------------------------------------------
const rulesets = useRulesets()
watch(
  () => rulesets.data.value,
  (list) => {
    if (list?.length && !rulesetId.value.value) rulesetId.setValue(String(list[0]!.id))
  },
  { immediate: true },
)
const rulesetOptions = computed(() =>
  (rulesets.data.value ?? []).map((rs) => ({
    value: String(rs.id),
    label: ruleSetOptionLabel(rs, {
      public: t('createCommunity.rules.public'),
      by: (n) => t('createCommunity.rules.by', { name: n }),
    }),
  })),
)
const chosenRuleset = computed(() =>
  rulesets.data.value?.find((rs) => String(rs.id) === rulesetId.value.value),
)
const maxima = computed(() => maxTheoretical(points.value.value))

function updatePoint(col: Column, index: number, raw: string) {
  pointsEdited.value = true
  const grid = { ...points.value.value, [col]: [...points.value.value[col]] }
  // '' (and anything non numeric) stays invalid instead of silently turning into 0.
  grid[col][index] = (raw === '' ? '' : Number(raw)) as number
  points.setValue(grid)
}

// --- Image ------------------------------------------------------------------------------------
const imageFile = ref<File>()
const imageUrl = ref<string>()
const imageError = ref('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

function revoke() {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = undefined
}
function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const problem = validateImage(file)
  imageError.value = problem ? t(`createCommunity.image.${problem}`) : ''
  if (problem) return
  revoke()
  imageFile.value = file
  imageUrl.value = URL.createObjectURL(file)
}
function removeImage() {
  revoke()
  imageFile.value = undefined
  imageError.value = ''
}
onBeforeUnmount(revoke)

// --- Submit -----------------------------------------------------------------------------------
const formEl = useTemplateRef<HTMLFormElement>('formEl')
async function focusFirstError() {
  await nextTick()
  formEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

const create = useCreateCommunity()
const submitting = computed(() => create.isPending.value)
const submitted = ref(false)

/** Set by any edit of the form (defaults loaded from the API do not count). */
const edited = ref(false)
const dirty = computed(() => !submitted.value && (edited.value || !!imageFile.value))
const unsaved = useUnsavedChanges(dirty)
/** Radio cards are buttons: they fire neither `input` nor `change`. */
watch([() => access.value.value, () => rulesMode.value.value], () => (edited.value = true))

const onSubmit = handleSubmit(
  async (values) => {
    if (submitting.value) return
    if (imageError.value) return void focusFirstError()
    try {
      const { community, imageUploaded } = await create.mutateAsync({
        name: values.name,
        description: values.description,
        open: values.access === 'open',
        rules:
          values.rulesMode === 'existing'
            ? { kind: 'existing', id: values.rulesetId }
            : { kind: 'new', name: values.rulesName, points: values.points },
        image: imageFile.value,
      })
      submitted.value = true
      toast.success(t('createCommunity.created', { name: community.name }))
      if (!imageUploaded) toast.error(t('createCommunity.imageFailed'))
      await router.push(`/comunidades/${community.id}`)
    } catch (e) {
      toast.error(t('createCommunity.failed'), e instanceof ApiError ? e.message : undefined)
    }
  },
  () => void focusFirstError(),
)

const accessOptions = computed(() => [
  {
    value: 'open' as const,
    title: t('createCommunity.access.open'),
    text: t('createCommunity.access.openText'),
  },
  {
    value: 'closed' as const,
    title: t('createCommunity.access.closed'),
    text: t('createCommunity.access.closedText'),
  },
])
const rulesModeOptions = computed(() => [
  {
    value: 'existing' as const,
    title: t('createCommunity.rules.existing'),
    text: t('createCommunity.rules.existingText'),
  },
  {
    value: 'new' as const,
    title: t('createCommunity.rules.new'),
    text: t('createCommunity.rules.newText'),
  },
])
</script>

<template>
  <div class="pg-main flex max-w-[1152px] flex-col gap-6">
    <Breadcrumb
      :items="[
        { label: t('communities.home'), to: '/home' },
        { label: t('communities.title'), to: '/comunidades' },
        { label: t('createCommunity.crumb') },
      ]"
    />

    <header class="flex flex-col gap-1">
      <PTitle>{{ t('createCommunity.title') }}</PTitle>
      <p class="text-muted">{{ t('createCommunity.intro') }}</p>
    </header>

    <div class="cc-split">
      <form
        ref="formEl"
        class="flex min-w-0 flex-col gap-6"
        novalidate
        :aria-label="t('createCommunity.form')"
        :aria-busy="submitting || undefined"
        @input="edited = true"
        @change="edited = true"
        @submit.prevent="onSubmit"
      >
        <!-- 1 · Basics -->
        <PCard tag="section">
          <template #header>
            <span
              aria-hidden="true"
              class="bg-primary text-on-primary inline-flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-bold"
              >1</span
            >
            <PTitle level="subtitle" as="h2" class="mr-auto">{{
              t('createCommunity.step.basics')
            }}</PTitle>
          </template>
          <div class="flex flex-wrap items-start gap-6">
            <div class="flex w-28 flex-none flex-col items-center gap-2 text-center">
              <div
                class="border-border-input bg-surface-muted text-muted flex size-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed"
                aria-hidden="true"
              >
                <img v-if="imageUrl" :src="imageUrl" alt="" class="size-full object-cover" />
                <span v-else class="text-3xl leading-none font-light">+</span>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png"
                class="sr-only"
                tabindex="-1"
                :aria-label="t('createCommunity.image.label')"
                @change="onFile"
              />
              <PButton
                variant="outline"
                size="sm"
                :aria-invalid="imageError ? true : undefined"
                aria-describedby="cc-image-help"
                @click="fileInput?.click()"
              >
                {{
                  imageFile ? t('createCommunity.image.change') : t('createCommunity.image.upload')
                }}
              </PButton>
              <button
                v-if="imageFile"
                type="button"
                :class="['text-link rounded-xs text-xs underline', focusRing]"
                @click="removeImage"
              >
                {{ t('createCommunity.image.remove') }}
              </button>
              <p id="cc-image-help" class="text-muted text-xs">
                {{ t('createCommunity.image.help') }}
              </p>
              <p v-if="imageError" role="alert" class="text-err text-xs">{{ imageError }}</p>
            </div>
            <div class="flex min-w-[260px] flex-1 flex-col gap-4">
              <PInput
                v-model="name.value.value"
                :label="t('createCommunity.name.label')"
                :help="t('createCommunity.name.counter', { n: name.value.value.length })"
                :error="nameError"
                :maxlength="NAME_MAX"
                autocomplete="off"
                @blur="name.handleBlur"
              />
              <PTextarea
                v-model="description.value.value"
                :label="t('createCommunity.description.label')"
                :placeholder="t('createCommunity.description.placeholder')"
              />
            </div>
          </div>
        </PCard>

        <!-- 2 · Access -->
        <PCard tag="section">
          <template #header>
            <span
              aria-hidden="true"
              class="bg-primary text-on-primary inline-flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-bold"
              >2</span
            >
            <PTitle level="subtitle" as="h2" class="mr-auto">{{
              t('createCommunity.step.access')
            }}</PTitle>
          </template>
          <OptionCards
            v-model="access.value.value"
            :options="accessOptions"
            :label="t('createCommunity.access.group')"
          />
        </PCard>

        <!-- 3 · Competition -->
        <PCard tag="section">
          <template #header>
            <span
              aria-hidden="true"
              class="bg-primary text-on-primary inline-flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-bold"
              >3</span
            >
            <PTitle level="subtitle" as="h2" class="mr-auto">{{
              t('createCommunity.step.competition')
            }}</PTitle>
          </template>
          <ErrorState
            v-if="competitions.isError.value"
            :what="t('createCommunity.competition.error')"
            :error="competitions.error.value"
            @retry="competitions.refetch()"
          />
          <div v-else-if="catalogLoading" class="grid2 gap-4" aria-hidden="true">
            <div class="skel h-16 rounded-md" />
            <div class="skel h-16 rounded-md" />
          </div>
          <div v-else class="grid2 gap-4">
            <PSelect
              v-model="competition.value.value"
              :label="t('createCommunity.competition.label')"
              :options="competitionOptions"
            />
            <PSelect
              v-model="season.value.value"
              :label="t('createCommunity.competition.season')"
              :options="seasonOptions"
            />
            <p class="text-muted col-span-full text-sm">
              {{ t('createCommunity.competition.note') }}
            </p>
          </div>
        </PCard>

        <!-- 4 · Rules -->
        <PCard tag="section">
          <template #header>
            <span
              aria-hidden="true"
              class="bg-primary text-on-primary inline-flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-bold"
              >4</span
            >
            <PTitle level="subtitle" as="h2" class="mr-auto">{{
              t('createCommunity.step.rules')
            }}</PTitle>
          </template>
          <div class="flex flex-col gap-4">
            <OptionCards
              v-model="rulesMode.value.value"
              :options="rulesModeOptions"
              :label="t('createCommunity.rules.group')"
            />
            <template v-if="rulesMode.value.value === 'existing'">
              <ErrorState
                v-if="rulesets.isError.value"
                :what="t('createCommunity.rules.error')"
                :error="rulesets.error.value"
                @retry="rulesets.refetch()"
              />
              <div
                v-else-if="rulesets.isLoading.value"
                class="flex flex-col gap-3"
                aria-hidden="true"
              >
                <div class="skel h-16 rounded-md" />
                <div class="skel h-48 rounded-md" />
              </div>
              <template v-else>
                <PSelect
                  v-model="rulesetId.value.value"
                  :label="t('createCommunity.rules.set')"
                  :placeholder="t('createCommunity.rules.setPlaceholder')"
                  :options="rulesetOptions"
                  :error="rulesetError"
                />
                <RuleSetTable v-if="chosenRuleset" :values="summarizeRuleSet(chosenRuleset.data)" />
              </template>
            </template>
            <template v-else>
              <PInput
                v-model="rulesName.value.value"
                :label="t('createCommunity.rules.name')"
                :placeholder="t('createCommunity.rules.namePlaceholder')"
                :error="rulesNameError"
                autocomplete="off"
                @blur="rulesName.handleBlur"
              />
              <RuleSetTable
                :points="points.value.value"
                :errors="pointErrors"
                @update="updatePoint"
              />
              <p v-if="firstPointError" role="alert" class="text-err text-xs">
                {{ firstPointError }}
              </p>
              <PrognoAlert
                variant="info"
                :title="t('createCommunity.rules.alertTitle')"
                aria-live="polite"
              >
                {{
                  t('createCommunity.rules.alertText', {
                    q: maxima.q,
                    s: maxima.sprint,
                    r: maxima.race,
                  })
                }}
              </PrognoAlert>
            </template>
          </div>
        </PCard>

        <div class="flex flex-wrap justify-end gap-3">
          <PButton variant="outline" to="/comunidades">{{ t('createCommunity.cancel') }}</PButton>
          <PButton type="submit" size="lg" :loading="submitting">{{
            t('createCommunity.submit')
          }}</PButton>
        </div>
      </form>

      <aside class="min-w-0">
        <CommunityPreview
          :name="name.value.value"
          :open="access.value.value === 'open'"
          :user="session.user?.username ?? ''"
          :competition="competitionLabel"
          :season="seasonLabel"
          :image-url="imageUrl"
        />
      </aside>
    </div>

    <ConfirmLeaveDialog
      :open="unsaved.open.value"
      @stay="unsaved.stay()"
      @leave="unsaved.leave()"
    />
  </div>
</template>

<style>
.cc-split {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 901px) {
  .cc-split {
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: start;
  }
}
</style>
