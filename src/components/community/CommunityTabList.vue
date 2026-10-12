<script setup lang="ts">
import { TabsList, TabsTrigger } from 'reka-ui'
import { useI18n } from 'vue-i18n'
import { focusRing } from '@/components/ui/styles'

/**
 * Tab buttons of the community page (Miembros / Reglas / Temporadas). Must be rendered inside a
 * Reka `TabsRoot` (the page owns it, because the tab panels and the aside live in different
 * columns of the layout). `tabs`: `{ value, label }[]`. Same look as `PTabs`, 44px targets on touch.
 */
defineProps<{ tabs: { value: string; label: string }[] }>()
const { t } = useI18n()
</script>

<template>
  <TabsList
    :aria-label="t('community.tabs.label')"
    class="border-border flex overflow-x-auto border-b"
  >
    <TabsTrigger
      v-for="tab in tabs"
      :key="tab.value"
      :value="tab.value"
      :class="[
        'text-muted hover:text-heading data-[state=active]:text-tint-fg data-[state=active]:border-focus-ring -mb-px inline-flex min-h-11 cursor-pointer items-center border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium whitespace-nowrap data-[state=active]:font-semibold',
        focusRing,
      ]"
    >
      {{ tab.label }}
    </TabsTrigger>
  </TabsList>
</template>
