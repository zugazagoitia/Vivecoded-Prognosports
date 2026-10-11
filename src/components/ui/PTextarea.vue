<script setup lang="ts">
import PField from './PField.vue'
import { controlBase } from './styles'

defineOptions({ inheritAttrs: false })

defineProps<{ label?: string; help?: string; error?: string }>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <PField v-slot="{ id, describedby, invalid }" :label="label" :help="help" :error="error">
    <textarea
      v-bind="$attrs"
      :id="id"
      v-model="model"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedby"
      :class="[controlBase, 'min-h-24 resize-y py-2.5 md:min-h-24']"
    />
  </PField>
</template>
