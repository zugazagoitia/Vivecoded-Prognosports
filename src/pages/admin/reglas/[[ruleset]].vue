<script setup lang="ts">
import { useQueries } from '@tanstack/vue-query'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { catalogApi } from '@/api'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PInput from '@/components/ui/PInput.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTag from '@/components/ui/PTag.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import { iconFor } from '@/components/ui/icons'
import {
  canDelete,
  CONCEPTS,
  formFromRuleset,
  KEY_SESSION,
  maxBySession,
  parseUsageRows,
  rulesetPayload,
  ruleRows,
  sessionKeys,
  validateRuleForm,
  type RuleForm,
} from '@/lib/adminRules'
import { parseUsages } from '@/lib/community-settings'
import {
  adminKeys,
  useCreateRuleset,
  useDeleteRuleset,
  useRulesets,
  useRulesetUsageRows,
} from '@/queries/admin'

/**
 * M9 · Reglas de puntuación (`/admin/reglas/:ruleset?`, `/admin/reglas/nuevo`): list of rule sets,
 * the 8 concepts by session with the maximum per session, usage, creation and deletion (never
 * editing). The usage count needs one request per set. The sessions are the keys of the data.
 */
definePage({ meta: { title: 'route.adminRules' } })

const { t } = useI18n()
const route = useRoute('/admin/reglas/[[ruleset]]')
const router = useRouter()

const q = useRulesets()
const sets = computed(() => q.data.value ?? [])
const isNew = computed(() => route.params.ruleset === 'nuevo')
const selected = computed(
  () => sets.value.find((s) => String(s.id) === route.params.ruleset) ?? sets.value[0],
)
const keys = computed(() => sessionKeys(sets.value))
const usageQs = useQueries({
  queries: computed(() =>
    sets.value.map((s) => ({
      queryKey: adminKeys.rulesetUsageRows(s.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => catalogApi.getRulesetUsages(s.id, signal),
      retry: false,
    })),
  ),
})
const usageCount = (idx: number) => {
  const d = usageQs.value[idx]?.data
  return d === undefined ? undefined : parseUsages(d)
}
const selectedIdx = computed(() => sets.value.findIndex((s) => s.id === selected.value?.id))
const selectedUsage = computed(() => usageCount(selectedIdx.value))
const usageRowsQ = useRulesetUsageRows(() => selected.value?.id)
const usageRows = computed(() => parseUsageRows(usageRowsQ.data.value))

const colLabel = (k: string) =>
  KEY_SESSION[k]
    ? t(`sessions.${KEY_SESSION[k]}.short`)
    : t('admin.rules.sessionFallback', { key: k })
const rows = computed(() => ruleRows(selected.value?.data, keys.value))
const maxes = computed(() => maxBySession(selected.value?.data, keys.value))

const select = (id: number) => void router.push(`/admin/reglas/${id}`)

// delete
const confirmDelete = ref(false)
const del = useDeleteRuleset()
function onDelete() {
  if (!selected.value) return
  del.mutate(selected.value.id, { onSuccess: () => void router.replace('/admin/reglas') })
}

// create
const form = reactive<RuleForm>(formFromRuleset(undefined, []))
const touched = ref(false)
watch(
  [isNew, () => selected.value?.id, keys],
  () => {
    if (!isNew.value) return
    Object.assign(form, formFromRuleset(selected.value, keys.value))
    form.name = ''
    form.description = ''
    form.isPublic = true
    touched.value = false
  },
  { immediate: true },
)
const validation = computed(() => validateRuleForm(form, keys.value))
const create = useCreateRuleset()
async function onCreate() {
  touched.value = true
  if (!validation.value.valid) return
  try {
    const created = await create.mutateAsync(rulesetPayload(form, keys.value))
    void router.replace(`/admin/reglas/${created.id}`)
  } catch {
    // Toasted by the mutation; the form keeps its values.
  }
}
const cellError = (c: string, k: string) =>
  touched.value && validation.value.cells[`${c}:${k}`] ? t('admin.rules.errors.points') : ''
const bonusKey = '2'
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminHeader :title="t('admin.rules.title')" :subtitle="t('admin.rules.subtitle')">
      <PButton to="/admin/reglas/nuevo" :icon="iconFor('add')">{{ t('admin.rules.new') }}</PButton>
    </AdminHeader>

    <ErrorState
      v-if="q.isError.value"
      :what="t('admin.rules.error')"
      :error="q.error.value"
      @retry="q.refetch()"
    />
    <Skeleton v-else-if="q.isLoading.value" variant="table" :rows="6" />
    <EmptyState v-else-if="!sets.length && !isNew" :title="t('admin.rules.empty')" icon="rule">
      <PButton to="/admin/reglas/nuevo" :icon="iconFor('add')">{{ t('admin.rules.new') }}</PButton>
    </EmptyState>
    <div v-else class="rules-lay">
      <PCard>
        <h2 class="t-header text-heading mb-2">{{ t('admin.rules.list') }}</h2>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          <li v-for="(s, i) in sets" :key="s.id">
            <button
              type="button"
              :aria-pressed="!isNew && selected?.id === s.id"
              :class="[
                'focus-visible:outline-focus-ring flex min-h-11 w-full cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2',
                !isNew && selected?.id === s.id
                  ? 'bg-tint border-focus-ring'
                  : 'bg-surface border-border',
              ]"
              @click="select(s.id)"
            >
              <span class="flex items-center justify-between gap-2">
                <b class="text-heading text-sm">{{ s.displayname }}</b>
                <PTag :color="s.public ? 'ok' : 'gray'">{{
                  t(s.public ? 'admin.rules.public' : 'admin.rules.private')
                }}</PTag>
              </span>
              <span class="text-muted text-xs">
                {{ t('admin.rules.by', { creator: s.creator?.username ?? '—' }) }} ·
                {{
                  usageCount(i) != null
                    ? t('admin.rules.usedBy', { n: usageCount(i) }, usageCount(i)!)
                    : t('admin.rules.usedUnknown')
                }}
              </span>
            </button>
          </li>
        </ul>
      </PCard>

      <div v-if="!isNew && selected" class="flex min-w-0 flex-col gap-5">
        <PCard :padded="false">
          <header
            class="border-border flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4"
          >
            <div class="flex min-w-0 flex-col">
              <h2 class="t-head text-heading text-xl font-semibold">{{ selected.displayname }}</h2>
              <span class="text-muted text-sm">{{ selected.description }}</span>
            </div>
            <PButton
              variant="outline"
              size="sm"
              class="text-err border-err"
              :icon="iconFor('delete')"
              :disabled="!canDelete(selectedUsage)"
              :title="
                canDelete(selectedUsage) ? t('admin.rules.delete') : t('admin.rules.deleteInUse')
              "
              @click="confirmDelete = true"
            >
              {{ t('admin.rules.delete') }}
            </PButton>
          </header>
          <div class="p-4">
            <AdminTable :caption="t('admin.rules.tableCaption')">
              <thead>
                <tr>
                  <th scope="col">{{ t('admin.rules.concept') }}</th>
                  <th v-for="k in keys" :key="k" scope="col" class="r">{{ colLabel(k) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.id">
                  <th
                    scope="row"
                    class="!text-body !bg-transparent !font-normal !tracking-normal !normal-case"
                  >
                    {{ t(`admin.rules.concepts.${r.id}`) }}
                  </th>
                  <td v-for="k in keys" :key="k" class="r">{{ r.cells[k] ?? '—' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" class="!bg-transparent">{{ t('admin.rules.maxBySession') }}</th>
                  <td v-for="k in keys" :key="k" class="r">
                    <b class="text-heading">{{ maxes[k] ?? '—' }}</b>
                  </td>
                </tr>
              </tfoot>
            </AdminTable>
          </div>
          <footer
            v-if="selectedUsage != null && !canDelete(selectedUsage)"
            class="border-border text-muted flex items-center gap-2 border-t px-5 py-3 text-sm"
          >
            <PIcon :name="iconFor('lock')" :size="16" />
            {{ t('admin.rules.locked', { n: selectedUsage }, selectedUsage) }}
          </footer>
        </PCard>

        <PCard :padded="false">
          <header class="border-border flex flex-col border-b px-5 py-4">
            <h2 class="t-header text-heading">{{ t('admin.rules.usage.title') }}</h2>
            <span class="text-muted text-sm">{{ t('admin.rules.usage.subtitle') }}</span>
          </header>
          <div class="p-4">
            <p v-if="!usageRows.length" class="text-muted text-sm">
              {{ t('admin.rules.usage.empty') }}
            </p>
            <AdminTable v-else :caption="t('admin.rules.usage.title')">
              <thead>
                <tr>
                  <th scope="col">{{ t('admin.rules.usage.community') }}</th>
                  <th scope="col">{{ t('admin.rules.usage.season') }}</th>
                  <th scope="col">{{ t('admin.rules.usage.exceptions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(u, i) in usageRows" :key="i">
                  <td>
                    <b class="text-heading">{{ u.community }}</b>
                  </td>
                  <td>{{ u.season ?? '—' }}</td>
                  <td>{{ u.exceptions ?? t('admin.rules.usage.none') }}</td>
                </tr>
              </tbody>
            </AdminTable>
          </div>
        </PCard>
      </div>

      <PCard v-else-if="isNew" :padded="false">
        <header class="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 class="t-header text-heading">{{ t('admin.rules.form.title') }}</h2>
          <PButton variant="ghost" size="sm" to="/admin/reglas">{{
            t('admin.rules.form.cancel')
          }}</PButton>
        </header>
        <form class="flex flex-col gap-4 p-5" novalidate @submit.prevent="onCreate">
          <div class="grid2 gap-4">
            <PInput
              v-model="form.name"
              :label="t('admin.rules.form.name')"
              :error="touched && validation.fields.name ? t('admin.rules.errors.name') : ''"
            />
            <PSelect
              :model-value="form.isPublic ? 'public' : 'private'"
              :label="t('admin.rules.form.visibility')"
              :options="[
                { value: 'public', label: t('admin.rules.form.visPublic') },
                { value: 'private', label: t('admin.rules.form.visPrivate') },
              ]"
              @update:model-value="(v) => (form.isPublic = v === 'public')"
            />
            <div class="col-span-full">
              <PInput
                v-model="form.description"
                :label="t('admin.rules.form.description')"
                :placeholder="t('admin.rules.form.descriptionPlaceholder')"
              />
            </div>
          </div>
          <AdminTable :caption="t('admin.rules.tableCaption')">
            <thead>
              <tr>
                <th scope="col">{{ t('admin.rules.concept') }}</th>
                <th v-for="k in keys" :key="k" scope="col">{{ colLabel(k) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in CONCEPTS" :key="c.id">
                <th
                  scope="row"
                  class="!text-body !bg-transparent !font-normal !tracking-normal !normal-case"
                >
                  {{ t(`admin.rules.concepts.${c.id}`) }}
                </th>
                <td v-for="k in keys" :key="k">
                  <span v-if="c.id === 'bonus' && k !== bonusKey" class="text-muted">—</span>
                  <input
                    v-else
                    v-model="form.cells[c.id][k]"
                    type="text"
                    :inputmode="c.id === 'exact' ? 'text' : 'numeric'"
                    :aria-label="
                      t('admin.rules.form.cellAria', {
                        concept: t(`admin.rules.concepts.${c.id}`),
                        session: colLabel(k),
                      })
                    "
                    :aria-invalid="cellError(c.id, k) ? true : undefined"
                    :class="[
                      'bg-surface-input text-heading border-border-input focus:border-focus-ring min-h-[34px] rounded-md border px-1.5 text-center text-sm',
                      c.id === 'exact' ? 'w-28' : 'w-16',
                      cellError(c.id, k) ? 'border-err' : '',
                    ]"
                  />
                </td>
              </tr>
            </tbody>
          </AdminTable>
          <p class="text-muted text-xs">{{ t('admin.rules.form.exactHelp') }}</p>
          <div class="flex justify-end">
            <PButton
              type="submit"
              size="sm"
              :loading="create.isPending.value"
              :disabled="touched && !validation.valid"
              >{{ t('admin.rules.form.create') }}</PButton
            >
          </div>
        </form>
      </PCard>
    </div>

    <PrognoModal
      v-model:open="confirmDelete"
      destructive
      :title="t('admin.rules.deleteTitle')"
      :description="t('admin.rules.deleteBody', { name: selected?.displayname ?? '' })"
      :confirm-label="t('admin.rules.delete')"
      @confirm="onDelete"
    />
  </div>
</template>

<style>
.rules-lay {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
@media (min-width: 1101px) {
  .rules-lay {
    grid-template-columns: 320px minmax(0, 1fr);
  }
}
</style>
