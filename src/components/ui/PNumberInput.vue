<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from './PButton.vue'
import PField from './PField.vue'
import { controlBase } from './styles'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    help?: string
    error?: string
    min?: number
    max?: number
    step?: number
  }>(),
  { step: 1 },
)
const model = defineModel<number | null>({ default: null })
const { t } = useI18n()

function clamp(n: number): number {
  if (props.min !== undefined && n < props.min) return props.min
  if (props.max !== undefined && n > props.max) return props.max
  return n
}
function bump(dir: 1 | -1) {
  model.value = clamp((model.value ?? props.min ?? 0) + dir * props.step)
}
function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  model.value = v === '' ? null : Number(v)
}
</script>

<template>
  <PField v-slot="{ id, describedby, invalid }" :label="label" :help="help" :error="error">
    <div class="flex gap-2">
      <PButton
        variant="outline"
        icon="minus"
        icon-only
        :aria-label="t('ui.number.dec')"
        :disabled="min !== undefined && (model ?? min) <= min"
        @click="bump(-1)"
      />
      <input
        v-bind="$attrs"
        :id="id"
        type="number"
        inputmode="decimal"
        :value="model ?? ''"
        :min="min"
        :max="max"
        :step="step"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedby"
        :class="[controlBase, 'text-center tabular-nums']"
        @input="onInput"
      />
      <PButton
        variant="outline"
        icon="plus"
        icon-only
        :aria-label="t('ui.number.inc')"
        :disabled="max !== undefined && (model ?? 0) >= max"
        @click="bump(1)"
      />
    </div>
  </PField>
</template>
