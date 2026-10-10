<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import PIcon from './PIcon.vue'
import type { IconName } from './icons'
import { focusRing } from './styles'

export interface TabItem {
  value: string
  label: string
  icon?: IconName
  disabled?: boolean
}

defineProps<{
  tabs: TabItem[]
  /** Accessible name of the tab list. */
  label: string
}>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <TabsRoot v-model="model" class="flex flex-col">
    <TabsList :aria-label="label" class="border-border flex overflow-x-auto border-b">
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        :disabled="tab.disabled"
        :class="[
          'text-muted hover:text-heading data-[state=active]:text-tint-fg data-[state=active]:border-focus-ring -mb-px inline-flex min-h-11 cursor-pointer items-center gap-2 border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:font-semibold md:min-h-10',
          focusRing,
        ]"
      >
        <PIcon v-if="tab.icon" :name="tab.icon" :size="16" />
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.value"
      :value="tab.value"
      :class="['pt-4', focusRing]"
    >
      <slot :name="tab.value" :tab="tab" />
    </TabsContent>
  </TabsRoot>
</template>
