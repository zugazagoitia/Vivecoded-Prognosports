<script setup lang="ts">
import PField from './PField.vue'
import PIcon from './PIcon.vue'
import type { IconName } from './icons'
import { controlBase } from './styles'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    label?: string
    help?: string
    error?: string
    /** Leading icon (search field: `magnifying-glass`). */
    icon?: IconName
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url'
  }>(),
  { type: 'text' },
)
const model = defineModel<string>({ default: '' })
</script>

<template>
  <PField v-slot="{ id, describedby, invalid }" :label="label" :help="help" :error="error">
    <div class="relative">
      <PIcon
        v-if="icon"
        :name="icon"
        :size="16"
        class="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
      />
      <input
        v-bind="$attrs"
        :id="id"
        v-model="model"
        :type="type"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedby"
        :class="[controlBase, icon ? 'pl-9' : '']"
      />
    </div>
  </PField>
</template>
