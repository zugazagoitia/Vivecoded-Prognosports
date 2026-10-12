<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GpCard from '@/components/gp/GpCard.vue'
import PButton from '@/components/ui/PButton.vue'
import type { Shortcut } from './usePredict'

/** «Atajos»: fill the slots from the grid, an earlier result or another of my predictions. */
defineProps<{ shortcuts: Shortcut[]; block?: boolean }>()
const emit = defineEmits<{ apply: [Shortcut] }>()
const { t } = useI18n()

const ICON = { grid: 'table-cells', results: 'flag', mine: 'copy' } as const
</script>

<template>
  <GpCard v-if="shortcuts.length" :title="t('predict.shortcuts.title')">
    <div class="flex flex-col gap-2" :class="block ? '' : 'items-start'">
      <PButton
        v-for="s in shortcuts"
        :key="s.id"
        variant="soft"
        size="sm"
        :icon="ICON[s.kind]"
        :block="block"
        :class="block ? 'min-h-11' : ''"
        @click="emit('apply', s)"
        >{{ s.label }}</PButton
      >
      <p class="text-muted m-0 text-xs">{{ t('predict.shortcuts.note') }}</p>
    </div>
  </GpCard>
</template>
