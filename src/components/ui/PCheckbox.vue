<script setup lang="ts">
import { useId } from 'vue'
import { focusRing } from './styles'

defineOptions({ inheritAttrs: false })

defineProps<{ label?: string; help?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
const id = `cb-${useId()}`
</script>

<template>
  <div class="flex min-h-11 items-start gap-2.5 py-2.5 md:min-h-0 md:py-1">
    <input
      v-bind="$attrs"
      :id="id"
      v-model="model"
      type="checkbox"
      :disabled="disabled"
      :aria-describedby="help ? `${id}-help` : undefined"
      :class="[
        'accent-brand-500 mt-0.5 size-[18px] flex-none cursor-pointer rounded-sm disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
      ]"
    />
    <div class="flex flex-col">
      <label :for="id" class="text-body cursor-pointer text-sm leading-5">
        <slot>{{ label }}</slot>
      </label>
      <span v-if="help" :id="`${id}-help`" class="text-muted text-xs leading-4">{{ help }}</span>
    </div>
  </div>
</template>
