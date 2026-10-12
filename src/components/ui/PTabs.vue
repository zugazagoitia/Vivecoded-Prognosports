<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import PIcon from './PIcon.vue'
import PTag from './PTag.vue'
import type { IconName } from './icons'
import { focusRing } from './styles'

export interface TabItem {
  value: string
  label: string
  icon?: IconName
  disabled?: boolean
  /** Counter shown in a grey pill after the label (part of the accessible name). */
  count?: number
}

defineProps<{
  tabs: TabItem[]
  /** Accessible name of the tab list. */
  label: string
}>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <TabsRoot v-model="model" class="flex min-w-0 flex-col">
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
        <PTag v-if="tab.count !== undefined">{{ tab.count }}</PTag>
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.value"
      :value="tab.value"
      :class="['min-w-0 pt-4', focusRing]"
    >
      <slot :name="tab.value" :tab="tab" />
    </TabsContent>
  </TabsRoot>
</template>
