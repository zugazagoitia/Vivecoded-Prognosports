<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { focusRing } from './styles'

defineProps<{ steps: { label: string }[] }>()
/** Zero-based index of the current step. */
const model = defineModel<number>({ default: 0 })
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <nav :aria-label="t('ui.stepper.label')">
      <ol class="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
        <li v-for="(s, i) in steps" :key="i">
          <button
            type="button"
            :aria-current="i === model ? 'step' : undefined"
            :class="[
              'text-muted hover:text-heading aria-[current=step]:bg-tint aria-[current=step]:text-tint-fg inline-flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium aria-[current=step]:font-semibold md:min-h-10',
              focusRing,
            ]"
            @click="model = i"
          >
            <span class="tabular-nums">{{ i + 1 }}</span>
            {{ s.label }}
          </button>
        </li>
      </ol>
    </nav>
    <div><slot :name="`step-${model}`" :step="model" /></div>
  </div>
</template>
