<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PredictionSlot from '@/components/data/PredictionSlot.vue'
import ValidationList from '@/components/data/ValidationList.vue'
import type { ValidationItem } from '@/components/data/types'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { formatNumber } from '@/utils/numbers'
import type { PredictVm } from './usePredict'

/** «Tu pronóstico · {sesión}»: the N slots, the progress, the messages and Vaciar/Guardar. */
const props = defineProps<{ vm: PredictVm; readonly?: boolean }>()
const { t } = useI18n()

const d = computed(() => props.vm.draft)
const n = computed(() => props.vm.n)
const sessionName = computed(() => props.vm.label?.long.toLocaleLowerCase('es') ?? '')

const message = computed(() =>
  props.vm.missing > 0
    ? t('predict.missing', { n: formatNumber(props.vm.missing) }, props.vm.missing)
    : t('predict.ready'),
)

const items = computed<ValidationItem[]>(() => {
  const out: ValidationItem[] = props.vm.hardIssues
    .filter((i) => i.key !== 'closed')
    .map((i) => ({ label: t(`predict.validation.${i.key}`), state: 'err' as const }))
  if (props.vm.saveError) out.push({ label: props.vm.saveError, state: 'err' })
  if (props.vm.attempted && props.vm.missing > 0) {
    out.push({
      label: t('predict.missing', { n: formatNumber(props.vm.missing) }, props.vm.missing),
      state: 'warn',
    })
  }
  return out
})
</script>

<template>
  <PCard tag="section" :padded="false">
    <template #header>
      <PTitle level="header" as="h2">{{
        t('predict.slots.title', { session: sessionName })
      }}</PTitle>
      <span class="text-muted text-sm tabular-nums">{{
        t('predict.slots.count', { done: vm.chosen, n })
      }}</span>
    </template>
    <div class="flex flex-col gap-3 p-4">
      <ProgressBar :value="vm.chosen" :max="n" :label="t('predict.slots.progress')" />
      <PrognoAlert v-if="readonly" variant="warn" :title="t('predict.closedLive.title')">
        {{ t('predict.closedLive.keep') }}
      </PrognoAlert>
      <PrognoAlert
        v-else-if="vm.recovered && d.dirty"
        variant="info"
        :title="t('predict.recovered.title')"
      >
        {{ t('predict.recovered.text') }}
        <PButton variant="ghost" size="sm" class="mt-1" @click="vm.discardChanges()">{{
          t('predict.recovered.discard')
        }}</PButton>
      </PrognoAlert>
      <PrognoAlert v-else-if="d.dirty" variant="warn" :title="t('predict.unsaved.title')">
        {{ t('predict.unsaved.text') }}
      </PrognoAlert>

      <ol class="m-0 flex list-none flex-col gap-2 p-0">
        <li v-for="(id, i) in d.sel" :key="i">
          <PredictionSlot
            :position="i + 1"
            :driver="vm.slotDriver(id)"
            :selected="!readonly && d.act === i"
            :can-move-up="i > 0"
            :can-move-down="i < n - 1"
            :readonly="readonly"
            @select="vm.activate(i)"
            @remove="vm.removeAt(i)"
            @move-up="vm.move(i, -1, $event ?? 'button')"
            @move-down="vm.move(i, 1, $event ?? 'button')"
            @drop="vm.dropOn(i, $event)"
          />
        </li>
      </ol>

      <ValidationList v-if="items.length" :items="items" />
    </div>
    <template v-if="!readonly" #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-3">
        <PButton variant="outline" size="sm" icon="rotate-right" @click="vm.clearAll()">{{
          t('predict.slots.clear')
        }}</PButton>
        <span class="text-sm" :class="vm.missing > 0 ? 'text-muted' : 'text-ok-fg font-semibold'">{{
          message
        }}</span>
        <PButton
          :disabled="!vm.canSave"
          :loading="vm.saving"
          :icon="d.saved && !d.dirty ? 'check' : undefined"
          @click="vm.submit()"
        >
          {{
            vm.saving
              ? t('predict.slots.saving')
              : d.saved && !d.dirty
                ? t('predict.slots.saved')
                : t('predict.slots.save')
          }}
        </PButton>
      </div>
    </template>
  </PCard>
</template>
