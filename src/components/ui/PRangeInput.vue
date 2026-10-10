<script setup lang="ts">
import PField from './PField.vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    label?: string
    help?: string
    error?: string
    min?: number
    max?: number
    step?: number
  }>(),
  { min: 0, max: 100, step: 1 },
)
const model = defineModel<number>({ default: 0 })
</script>

<template>
  <PField v-slot="{ id, describedby, invalid }" :label="label" :help="help" :error="error">
    <div class="flex min-h-11 items-center gap-3">
      <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
      <input
        v-bind="$attrs"
        :id="id"
        v-model.number="model"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedby"
        class="accent-brand-500 focus-visible:outline-focus-ring h-6 min-w-0 flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
      <output :for="id" class="text-heading w-10 text-right text-sm font-semibold tabular-nums">{{
        model
      }}</output>
    </div>
  </PField>
</template>
