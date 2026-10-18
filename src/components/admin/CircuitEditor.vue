<script setup lang="ts">
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import ConfirmLeaveDialog from '@/components/data/ConfirmLeaveDialog.vue'
import { ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import { iconFor } from '@/components/ui/icons'
import { circuitLayoutUrl, uploadCircuitLayout } from '@/api/catalog'
import { useAdminCrumbs } from '@/composables/useAdminCrumbs'
import { toaster } from '@/composables/useToast'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import {
  circuitSchema,
  formatKm,
  formatTimezone,
  parseDecimal,
  variantSchema,
} from '@/lib/adminCatalog'
import { circuitTimeZone } from '@/lib/gp'
import {
  useAdminCircuit,
  useDeleteCircuit,
  useDeleteVariant,
  useSaveCircuit,
  useSaveVariant,
} from '@/queries/admin'
import { useQueryClient } from '@tanstack/vue-query'

/**
 * M7 · Circuito (alta y edición): datos, imagen del trazado y variantes. The API has no time zone
 * for a circuit (the select is read-only and deduced from the country). Circuit and variant
 * deletion ask for confirmation and show the backend's error when still in use. «Imagen del trazado» uploads the layout of the first variant.
 */
const props = defineProps<{ circuit?: string }>()
// Public data (issue 204) is loaded on demand: the public data layer stays out of the eager bundle.
const PublicCircuitFill = defineAsyncComponent(
  () => import('@/components/admin/PublicCircuitFill.vue'),
)
const { t } = useI18n()
const router = useRouter()
const qc = useQueryClient()
const isNew = computed(() => !props.circuit)

const q = useAdminCircuit(() => props.circuit)
const c = computed(() => (isNew.value ? undefined : q.data.value))
const save = useSaveCircuit(() => props.circuit)
const saveVariant = useSaveVariant(() => props.circuit ?? '')
const delVariant = useDeleteVariant(() => props.circuit ?? '')
const delCircuit = useDeleteCircuit()

interface Form {
  name: string
  country: string
  locality: string
  latitude: string
  longitude: string
}
const blank = (): Form => ({ name: '', country: '', locality: '', latitude: '', longitude: '' })
const form = reactive<Form>(blank())
const base = ref<Form>(blank())
watch(
  c,
  (v) => {
    base.value = v
      ? {
          name: v.name ?? '',
          country: v.country ?? '',
          locality: v.locality ?? '',
          latitude: v.latitude != null ? String(v.latitude) : '',
          longitude: v.longitude != null ? String(v.longitude) : '',
        }
      : blank()
    Object.assign(form, base.value)
  },
  { immediate: true },
)
/** Public values pre-fill the form only; «Guardar» saves them. */
function applyPublic(fields: Partial<Form>) {
  Object.assign(form, fields)
}
const dirty = computed(() =>
  (Object.keys(form) as (keyof Form)[]).some((k) => form[k] !== base.value[k]),
)
const guard = useUnsavedChanges(dirty)
const touched = ref(false)

const clean = (f: Form) => ({
  ...f,
  latitude: parseDecimal(f.latitude),
  longitude: parseDecimal(f.longitude),
})
const parsed = computed(() => circuitSchema.safeParse(clean(form)))
const errors = computed(() => {
  const out: Record<string, string> = {}
  if (touched.value && !parsed.value.success) {
    for (const i of parsed.value.error.issues) out[String(i.path[0])] ??= t(String(i.message))
  }
  return out
})

async function onSave() {
  touched.value = true
  if (!parsed.value.success) return
  const d = parsed.value.data
  const body: Record<string, unknown> = {}
  for (const k of ['name', 'country', 'locality', 'latitude', 'longitude'] as const) {
    if (!isNew.value && form[k] === base.value[k]) continue
    if (d[k] !== undefined && d[k] !== '') body[k] = d[k]
  }
  if (!isNew.value && !Object.keys(body).length) return
  const result = await save.mutateAsync(body)
  base.value = { ...form }
  if (isNew.value) await router.replace(`/admin/circuitos/${result.id}`)
}

const tz = computed(() => circuitTimeZone(c.value))
const tzOptions = computed(() => [
  {
    value: tz.value ?? '',
    label: tz.value ? formatTimezone(tz.value) : t('admin.circuitEdit.data.timezoneNone'),
  },
])

useAdminCrumbs(() => [
  { label: isNew.value ? t('admin.circuitEdit.titleNew') : (c.value?.name ?? '…') },
])

// image: layout of the first variant
const firstVariant = computed(() => c.value?.variants?.[0])
const imageSrc = ref('')
watch(
  [firstVariant, () => props.circuit],
  () => {
    const v = firstVariant.value
    imageSrc.value = v?.hasLayoutImage && props.circuit ? circuitLayoutUrl(props.circuit, v.id) : ''
  },
  { immediate: true },
)
const file = ref<HTMLInputElement | null>(null)
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f || !props.circuit || !firstVariant.value) return
  await uploadCircuitLayout(props.circuit, firstVariant.value.id, f)
  toaster.success(t('admin.circuitEdit.toast.saved'))
  await qc.invalidateQueries({ queryKey: ['admin', 'circuit'] })
  imageSrc.value = `${circuitLayoutUrl(props.circuit, firstVariant.value.id)}?v=${Date.now()}`
}

// variants modal
const modal = ref(false)
const editing = ref<number | undefined>()
const vf = reactive({ name: '', distance: '', turns: '' })
const vTouched = ref(false)
const vParsed = computed(() =>
  variantSchema.safeParse({ ...vf, distance: parseDecimal(vf.distance) }),
)
const vErrors = computed(() => {
  const out: Record<string, string> = {}
  if (vTouched.value && !vParsed.value.success) {
    for (const i of vParsed.value.error.issues) out[String(i.path[0])] ??= t(String(i.message))
  }
  return out
})
function openVariant(v?: {
  id: number
  name?: string | null
  distance?: number | null
  turns?: number | null
}) {
  editing.value = v?.id
  vf.name = v?.name ?? ''
  vf.distance = v?.distance != null ? String(v.distance) : ''
  vf.turns = v?.turns != null ? String(v.turns) : ''
  vTouched.value = false
  modal.value = true
}
// deletions (confirmed in a modal; the backend refuses what is still in use)
const confirmCircuit = ref(false)
const variantToDelete = ref<{ id: number; name: string } | undefined>()
const confirmVariant = computed({
  get: () => variantToDelete.value != null,
  set: (v) => {
    if (!v) variantToDelete.value = undefined
  },
})
function onDeleteCircuit() {
  if (!props.circuit) return
  // The page is going away: do not ask «unsaved changes» on the way out.
  delCircuit.mutate(props.circuit, {
    onSuccess: () => {
      Object.assign(form, base.value)
      void router.replace('/admin/circuitos')
    },
  })
}
function onDeleteVariant() {
  const v = variantToDelete.value
  if (v) delVariant.mutate(v.id)
}
async function onVariant() {
  vTouched.value = true
  if (!vParsed.value.success) return
  await saveVariant.mutateAsync({ id: editing.value, body: vParsed.value.data })
  modal.value = false
}
</script>

<template>
  <ErrorState
    v-if="!isNew && q.isError.value && !q.error.value?.message?.includes('inválido')"
    :what="t('admin.circuitEdit.error')"
    :error="q.error.value"
    @retry="q.refetch()"
  />
  <section v-else-if="!isNew && q.isError.value" class="flex flex-col gap-3 py-10 text-center">
    <h1 class="t-title text-heading">{{ t('admin.circuitEdit.notFound') }}</h1>
    <PButton to="/admin/circuitos" class="mx-auto">{{ t('admin.circuits.title') }}</PButton>
  </section>
  <div v-else class="flex flex-col gap-6">
    <AdminHeader
      :title="isNew ? t('admin.circuitEdit.titleNew') : (c?.name ?? '…')"
      :subtitle="t('admin.circuitEdit.subtitle')"
    />
    <Skeleton v-if="!isNew && !c" variant="card" />
    <template v-else>
      <PCard :padded="false">
        <header class="border-border border-b px-5 py-4">
          <h2 class="t-header text-heading">{{ t('admin.circuitEdit.data.title') }}</h2>
        </header>
        <form class="grid2 gap-4 p-5" novalidate @submit.prevent="onSave">
          <PInput
            v-model="form.name"
            :label="t('admin.circuitEdit.data.name')"
            :error="errors.name"
          />
          <PInput
            v-model="form.country"
            :label="t('admin.circuitEdit.data.country')"
            :error="errors.country"
          />
          <PInput v-model="form.locality" :label="t('admin.circuitEdit.data.locality')" />
          <PSelect
            :model-value="tz ?? ''"
            :options="tzOptions"
            :label="t('admin.circuitEdit.data.timezone')"
            :help="t('admin.circuitEdit.data.timezoneHelp')"
            disabled
          />
          <PInput
            v-model="form.latitude"
            inputmode="decimal"
            :label="t('admin.circuitEdit.data.latitude')"
            :error="errors.latitude"
          />
          <PInput
            v-model="form.longitude"
            inputmode="decimal"
            :label="t('admin.circuitEdit.data.longitude')"
            :error="errors.longitude"
          />
          <div class="col-span-full flex flex-wrap items-center gap-4">
            <img
              v-if="imageSrc"
              :src="imageSrc"
              :alt="t('admin.circuitEdit.data.imageAlt', { name: c?.name ?? '' })"
              width="120"
              height="80"
              class="bg-surface-muted h-20 w-[120px] rounded-lg object-contain"
            />
            <div
              v-else
              class="bg-surface-muted ring-border h-20 w-[120px] rounded-lg ring-1 ring-inset"
              aria-hidden="true"
            />
            <div class="flex flex-col gap-1">
              <span
                id="circuit-image-label"
                class="text-body text-xs font-bold tracking-wide uppercase"
                >{{ t('admin.circuitEdit.data.image') }}</span
              >
              <input
                ref="file"
                type="file"
                accept="image/*"
                class="sr-only"
                tabindex="-1"
                aria-hidden="true"
                @change="onFile"
              />
              <PButton
                variant="outline"
                size="sm"
                type="button"
                :icon="iconFor('upload')"
                :disabled="isNew || !firstVariant"
                aria-describedby="circuit-image-label circuit-image-help"
                @click="file?.click()"
              >
                {{ t('admin.circuitEdit.data.upload') }}
              </PButton>
              <span id="circuit-image-help" class="text-muted text-xs">{{
                isNew ? t('admin.circuitEdit.data.needSave') : t('admin.circuitEdit.data.imageHelp')
              }}</span>
            </div>
          </div>
          <div class="col-span-full">
            <PublicCircuitFill :name="form.name" :saved="base" @apply="applyPublic" />
          </div>
          <div class="border-border col-span-full flex justify-end gap-3 border-t pt-3">
            <PButton
              v-if="!isNew"
              variant="outline"
              size="sm"
              type="button"
              class="mr-auto"
              :icon="iconFor('delete')"
              :loading="delCircuit.isPending.value"
              @click="confirmCircuit = true"
              >{{ t('admin.circuitEdit.delete.button') }}</PButton
            >
            <PButton variant="outline" size="sm" to="/admin/circuitos">{{
              t('admin.circuitEdit.data.cancel')
            }}</PButton>
            <PButton type="submit" size="sm" :loading="save.isPending.value">{{
              t('admin.circuitEdit.data.save')
            }}</PButton>
          </div>
        </form>
      </PCard>

      <PCard :padded="false">
        <header class="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 class="t-header text-heading">{{ t('admin.circuitEdit.variants.title') }}</h2>
          <PButton
            variant="outline"
            size="sm"
            :icon="iconFor('add')"
            :disabled="isNew"
            @click="openVariant()"
          >
            {{ t('admin.circuitEdit.variants.add') }}
          </PButton>
        </header>
        <div class="p-4">
          <p v-if="!c?.variants?.length" class="text-muted text-sm">
            {{ t('admin.circuitEdit.variants.empty') }}
          </p>
          <AdminTable v-else :caption="t('admin.circuitEdit.variants.caption')">
            <thead>
              <tr>
                <th scope="col">{{ t('admin.circuitEdit.variants.name') }}</th>
                <th scope="col" class="r">{{ t('admin.circuitEdit.variants.length') }}</th>
                <th scope="col" class="r">{{ t('admin.circuitEdit.variants.turns') }}</th>
                <th scope="col">
                  <span class="sr-only">{{ t('admin.circuits.actions') }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in c.variants" :key="v.id">
                <td>{{ v.name }}</td>
                <td class="r">{{ v.distance != null ? formatKm(v.distance) : '—' }}</td>
                <td class="r">{{ v.turns ?? '—' }}</td>
                <td class="r">
                  <PButton
                    variant="ghost"
                    size="sm"
                    :aria-label="t('admin.circuitEdit.variants.editAria', { name: v.name ?? '' })"
                    @click="openVariant(v)"
                  >
                    {{ t('admin.circuitEdit.variants.edit') }}
                  </PButton>
                  <PButton
                    variant="ghost"
                    size="sm"
                    :aria-label="t('admin.circuitEdit.variants.deleteAria', { name: v.name ?? '' })"
                    @click="variantToDelete = { id: v.id, name: v.name ?? '' }"
                  >
                    {{ t('admin.circuitEdit.variants.delete') }}
                  </PButton>
                </td>
              </tr>
            </tbody>
          </AdminTable>
        </div>
      </PCard>
    </template>

    <PrognoModal
      v-model:open="modal"
      :title="
        editing != null
          ? t('admin.circuitEdit.variants.modalEdit')
          : t('admin.circuitEdit.variants.modalNew')
      "
    >
      <form
        id="admin-variant-form"
        class="flex flex-col gap-3"
        novalidate
        @submit.prevent="onVariant"
      >
        <PInput
          v-model="vf.name"
          :label="t('admin.circuitEdit.variants.name')"
          :error="vErrors.name"
        />
        <PInput
          v-model="vf.distance"
          inputmode="decimal"
          :label="t('admin.circuitEdit.variants.distance')"
          :error="vErrors.distance"
        />
        <PInput
          v-model="vf.turns"
          inputmode="numeric"
          :label="t('admin.circuitEdit.variants.turns')"
          :error="vErrors.turns"
        />
      </form>
      <template #footer>
        <PButton variant="outline" @click="modal = false">{{
          t('admin.circuitEdit.variants.cancel')
        }}</PButton>
        <PButton :loading="saveVariant.isPending.value" @click="onVariant">{{
          t('admin.circuitEdit.variants.save')
        }}</PButton>
      </template>
    </PrognoModal>
    <PrognoModal
      v-model:open="confirmCircuit"
      destructive
      :title="t('admin.circuitEdit.delete.title')"
      :description="t('admin.circuitEdit.delete.body', { name: c?.name ?? '' })"
      :confirm-label="t('admin.delete.confirm')"
      @confirm="onDeleteCircuit"
    />
    <PrognoModal
      v-model:open="confirmVariant"
      destructive
      :title="t('admin.circuitEdit.variants.deleteTitle')"
      :description="
        t('admin.circuitEdit.variants.deleteBody', { name: variantToDelete?.name ?? '' })
      "
      :confirm-label="t('admin.delete.confirm')"
      @confirm="onDeleteVariant"
    />
    <ConfirmLeaveDialog :open="guard.open.value" @stay="guard.stay" @leave="guard.leave" />
  </div>
</template>
