<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useId } from 'vue'
import { focusRing } from './styles'

defineProps<{ label?: string; name?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
const id = `sw-${useId()}`
</script>

<template>
  <div class="flex min-h-11 items-center gap-3 md:min-h-0">
    <SwitchRoot
      :id="id"
      v-model="model"
      :name="name"
      :disabled="disabled"
      :class="[
        'data-[state=checked]:bg-brand-500 bg-border-input relative h-[22px] w-10 flex-none cursor-pointer rounded-full p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        focusRing,
      ]"
    >
      <SwitchThumb
        class="block size-[18px] translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[20px] motion-reduce:transition-none"
      />
    </SwitchRoot>
    <label :for="id" class="text-body cursor-pointer text-sm leading-5">
      <slot>{{ label }}</slot>
    </label>
  </div>
</template>
