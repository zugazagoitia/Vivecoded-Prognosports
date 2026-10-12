<script setup lang="ts">
import PField from './PField.vue'
import { controlBase } from './styles'

defineOptions({ inheritAttrs: false })

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

defineProps<{
  label?: string
  help?: string
  error?: string
  options: SelectOption[]
  /** Disabled empty first option, e.g. «Selecciona una opción». */
  placeholder?: string
}>()
const model = defineModel<string | number>({ default: '' })
</script>

<template>
  <PField v-slot="{ id, describedby, invalid }" :label="label" :help="help" :error="error">
    <select
      v-bind="$attrs"
      :id="id"
      v-model="model"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedby"
      :class="controlBase"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value" :disabled="o.disabled">
        {{ o.label }}
      </option>
    </select>
  </PField>
</template>
