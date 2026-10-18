<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryClient } from '@tanstack/vue-query'
import PButton from '@/components/ui/PButton.vue'
import PSelect from '@/components/ui/PSelect.vue'
import {
  circuitDifferences,
  matchPublicCircuit,
  sourceConflicts,
  type PublicCircuit,
  type PublicCircuitFields,
  type PublicCircuitList,
} from '@/lib/publicData/circuits'
import { PUBLIC_CIRCUITS_SEASON, publicCircuitsQuery } from '@/queries/publicCircuit'

/**
 * «Rellenar con datos públicos» (issue 204, circuit form). The first click loads the season's circuits,
 * picks the one named like the form and pre-fills country, locality and coordinates. Nothing is
 * saved here: the parent sets its form, and «Guardar» saves. Saved values that differ from the
 * source are listed as warnings. Loaded on demand so the public data layer stays out of the bundle.
 */
type Saved = Record<keyof PublicCircuitFields, string>
const props = defineProps<{
  /** Name typed in the form, used to find the circuit. */
  name: string
  /** Saved values of the circuit (empty on a new one): the warnings compare against these. */
  saved: Saved
}>()
const emit = defineEmits<{ apply: [fields: Partial<Saved>] }>()
const { t, locale } = useI18n()
const qc = useQueryClient()

const open = ref(false)
const state = ref<'loading' | 'error' | 'ready'>('loading')
const list = ref<PublicCircuitList>()
const selectedId = ref('')
const applied = ref('')

const selected = computed(() => list.value?.circuits.find((c) => c.id === selectedId.value))
const differences = computed(() =>
  selected.value ? circuitDifferences(props.saved, selected.value) : [],
)
const conflicts = computed(() => (selected.value ? sourceConflicts(selected.value) : []))
const options = computed(() => [
  { value: '', label: t('publicCircuit.selectPlaceholder') },
  ...(list.value?.circuits ?? []).map((c) => ({
    value: c.id,
    label: [c.name, c.locality].filter(Boolean).join(' · '),
  })),
])
const sourceLine = computed(() =>
  list.value
    ? t('publicCircuit.source', {
        source: t(`publicCircuit.sources.${list.value.source}`),
        time: new Date(list.value.fetchedAt).toLocaleString(locale.value),
      })
    : '',
)
const coordinate = (v: number | null) => (v == null ? t('publicCircuit.pending') : String(v))

async function load(): Promise<PublicCircuitList | undefined> {
  open.value = true
  state.value = 'loading'
  try {
    list.value = await qc.fetchQuery(publicCircuitsQuery(PUBLIC_CIRCUITS_SEASON))
    state.value = 'ready'
    return list.value
  } catch {
    state.value = 'error'
    return undefined
  }
}

/** Sends the circuit's values to the form. Coordinates the source does not give are left alone. */
function apply(c: PublicCircuit) {
  const fields: Partial<Saved> = {}
  if (c.country) fields.country = c.country
  if (c.locality) fields.locality = c.locality
  if (c.latitude != null) fields.latitude = String(c.latitude)
  if (c.longitude != null) fields.longitude = String(c.longitude)
  emit('apply', fields)
  applied.value = c.name
}

/** «Rellenar»: one click loads, matches and applies. Without a match the admin picks a circuit. */
async function onFill() {
  const data = await load()
  if (!data) return
  const match = matchPublicCircuit(props.name, data.circuits)
  selectedId.value = match?.id ?? ''
  if (match) apply(match)
}

function onApplySelected() {
  if (selected.value) apply(selected.value)
}
</script>

<template>
  <div class="flex w-full flex-col gap-3">
    <div class="flex justify-end">
      <PButton
        variant="outline"
        size="sm"
        type="button"
        :loading="state === 'loading' && open"
        @click="onFill"
      >
        {{ t('publicCircuit.open') }}
      </PButton>
    </div>

    <section
      v-if="open"
      :aria-label="t('publicCircuit.title')"
      class="border-border bg-surface-muted flex flex-col gap-3 rounded-md border p-3 text-sm"
    >
      <h3 class="text-heading font-semibold">{{ t('publicCircuit.title') }}</h3>
      <p class="text-muted">{{ t('publicCircuit.hint', { season: PUBLIC_CIRCUITS_SEASON }) }}</p>

      <p v-if="state === 'loading'" role="status" class="text-muted">
        {{ t('publicCircuit.loading') }}
      </p>

      <div v-else-if="state === 'error'" class="flex flex-wrap items-center gap-3">
        <p role="alert" class="text-err">{{ t('publicCircuit.error') }}</p>
        <PButton variant="outline" size="sm" type="button" @click="onFill">
          {{ t('publicCircuit.retry') }}
        </PButton>
        <PButton variant="outline" size="sm" type="button" @click="open = false">
          {{ t('publicCircuit.close') }}
        </PButton>
      </div>

      <template v-else>
        <p v-if="list?.source === 'openf1'" class="text-muted">{{ t('publicCircuit.fallback') }}</p>
        <p v-if="list" class="text-muted">{{ sourceLine }}</p>
        <PSelect v-model="selectedId" :options="options" :label="t('publicCircuit.select')" />
        <p v-if="!selected && !applied" class="text-muted" role="status">
          {{ t('publicCircuit.noMatch', { season: PUBLIC_CIRCUITS_SEASON }) }}
        </p>

        <template v-if="selected">
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 tabular-nums">
            <dt class="text-muted">{{ t('publicCircuit.fields.country') }}</dt>
            <dd>{{ selected.country ?? t('publicCircuit.pending') }}</dd>
            <dt class="text-muted">{{ t('publicCircuit.fields.locality') }}</dt>
            <dd>{{ selected.locality ?? t('publicCircuit.pending') }}</dd>
            <dt class="text-muted">{{ t('publicCircuit.fields.latitude') }}</dt>
            <dd>{{ coordinate(selected.latitude) }}</dd>
            <dt class="text-muted">{{ t('publicCircuit.fields.longitude') }}</dt>
            <dd>{{ coordinate(selected.longitude) }}</dd>
          </dl>
          <a
            v-if="selected.infoUrl"
            :href="selected.infoUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent underline"
            >{{ t('publicCircuit.reference') }}</a
          >

          <div class="flex flex-col gap-1">
            <h4 class="text-heading font-semibold">{{ t('publicCircuit.differencesTitle') }}</h4>
            <p v-if="!differences.length && !conflicts.length" class="text-muted">
              {{ t('publicCircuit.noDifferences') }}
            </p>
            <div v-else role="alert" class="text-err">
              <ul class="flex flex-col gap-1">
                <li v-for="d in differences" :key="d.field">
                  {{
                    t('publicCircuit.differs', {
                      field: t(`publicCircuit.fields.${d.field}`),
                      saved: d.saved,
                      source: d.source,
                    })
                  }}
                </li>
                <li v-for="c in conflicts" :key="c.openf1">
                  {{ t('publicCircuit.conflict', { jolpica: c.jolpica, openf1: c.openf1 }) }}
                </li>
              </ul>
            </div>
          </div>
        </template>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p v-if="applied" role="status" class="text-muted text-xs">
            {{ t('publicCircuit.applied', { name: applied }) }}
          </p>
          <span v-else />
          <div class="flex gap-2">
            <PButton variant="outline" size="sm" type="button" @click="open = false">
              {{ t('publicCircuit.close') }}
            </PButton>
            <PButton size="sm" type="button" :disabled="!selected" @click="onApplySelected">
              {{ t('publicCircuit.apply') }}
            </PButton>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
