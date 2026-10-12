<script setup lang="ts">
import { computed, useId } from 'vue'
import PIcon from './PIcon.vue'

const props = defineProps<{
  label?: string
  help?: string
  error?: string
  /** Id of the control (generated when omitted). */
  id?: string
}>()

const uid = useId()
const controlId = computed(() => props.id ?? `f-${uid}`)
const helpId = computed(() => `${controlId.value}-help`)
const errorId = computed(() => `${controlId.value}-err`)
const describedby = computed(
  () =>
    [props.error ? errorId.value : undefined, props.help ? helpId.value : undefined]
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1">
    <label
      v-if="label"
      :for="controlId"
      class="text-body text-xs leading-4 font-bold tracking-wide uppercase"
    >
      {{ label }}
    </label>
    <slot :id="controlId" :describedby="describedby" :invalid="!!error" />
    <p v-if="help" :id="helpId" class="text-muted text-xs leading-4">{{ help }}</p>
    <p
      v-if="error"
      :id="errorId"
      role="alert"
      class="text-err flex items-center gap-1 text-xs leading-4"
    >
      <PIcon name="circle-exclamation" :size="16" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
