<script setup lang="ts" generic="T extends string">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { focusRing } from '@/components/ui/styles'

/**
 * Radio cards (`.opt` of the mockup) as a Reka UI radio group: arrow keys move the selection,
 * the group has an accessible name. Selected card: inset ring + tint background.
 *
 * Props: `options` ({ value, title, text }), `label` (group name). Model: selected value.
 */
defineProps<{ options: { value: T; title: string; text: string }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <RadioGroupRoot v-model="model" :aria-label="label" class="grid2 gap-3">
    <RadioGroupItem
      v-for="o in options"
      :key="o.value"
      :value="o.value"
      :class="[
        'border-border-input bg-surface data-[state=checked]:bg-tint data-[state=checked]:ring-focus-ring flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-4 text-left data-[state=checked]:ring-2 data-[state=checked]:ring-inset',
        focusRing,
      ]"
    >
      <span
        aria-hidden="true"
        class="border-border-input bg-surface data-[state=checked]:border-primary mt-0.5 inline-flex size-[18px] flex-none items-center justify-center rounded-full border-2"
        :data-state="model === o.value ? 'checked' : 'unchecked'"
      >
        <RadioGroupIndicator as-child>
          <span class="bg-primary size-2 rounded-full" />
        </RadioGroupIndicator>
      </span>
      <span class="flex min-w-0 flex-col gap-0.5">
        <span class="text-heading text-sm font-bold">{{ o.title }}</span>
        <span class="text-muted text-sm">{{ o.text }}</span>
      </span>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
