<script setup lang="ts">
import { useId } from 'vue'
import { focusRing } from './styles'

defineOptions({ inheritAttrs: false })

/** One radio; give the radios of a group the same `name` and wrap them in a `<fieldset>`. */
defineProps<{ value: string | number; name?: string; label?: string; disabled?: boolean }>()
const model = defineModel<string | number | null>({ default: null })
const id = `rd-${useId()}`
</script>

<template>
  <div class="flex min-h-11 items-start gap-2.5 py-2.5 md:min-h-0 md:py-1">
    <input
      v-bind="$attrs"
      :id="id"
      v-model="model"
      type="radio"
      :name="name"
      :value="value"
      :disabled="disabled"
      :class="[
        'accent-brand-500 mt-0.5 size-[18px] flex-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
      ]"
    />
    <label :for="id" class="text-body cursor-pointer text-sm leading-5">
      <slot>{{ label }}</slot>
    </label>
  </div>
</template>
