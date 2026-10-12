<script setup lang="ts">
import { useTemplateRef } from 'vue'
import PField from '@/components/ui/PField.vue'
import { controlBase } from '@/components/ui/styles'
import { CODE_LENGTH, normalizeCode } from './reset'

/** Single-field verification code: upper-cased, trimmed, paste-friendly (shared with A5). */
defineProps<{ label: string; help?: string; error?: string }>()
const model = defineModel<string>({ default: '' })
const input = useTemplateRef<HTMLInputElement>('input')

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const v = normalizeCode(el.value)
  model.value = v
  // Keep the DOM in sync when characters were dropped.
  if (el.value !== v) el.value = v
}
function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text')
  if (text === undefined) return
  e.preventDefault()
  model.value = normalizeCode(text)
}
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <PField v-slot="{ id, describedby, invalid }" :label="label" :help="help" :error="error">
    <input
      :id="id"
      ref="input"
      :value="model"
      type="text"
      inputmode="text"
      autocomplete="one-time-code"
      autocapitalize="characters"
      autocorrect="off"
      spellcheck="false"
      :maxlength="CODE_LENGTH * 2"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedby"
      :class="[
        controlBase,
        'text-center font-mono text-xl font-semibold tracking-[0.4em] uppercase',
      ]"
      @input="onInput"
      @paste="onPaste"
    />
  </PField>
</template>
