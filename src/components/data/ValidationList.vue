<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'

import type { ValidationItem } from './types'

defineProps<{ items: ValidationItem[] }>()

const { t } = useI18n()

const ICON = {
  ok: 'circle-check',
  warn: 'triangle-exclamation',
  err: 'circle-exclamation',
} as const
</script>

<template>
  <ul class="m-0 flex list-none flex-col gap-1 p-0">
    <li
      v-for="item in items"
      :key="item.label"
      :data-state="item.state"
      class="flex min-h-11 items-center gap-2 text-sm"
      :class="{
        'text-ok-fg': item.state === 'ok',
        'text-warn-fg': item.state === 'warn',
        'text-err-fg': item.state === 'err',
      }"
    >
      <PIcon :name="ICON[item.state]" :size="20" />
      <span class="font-semibold">{{ t(`data.validation.${item.state}`) }}:</span>
      <RouterLink
        v-if="item.href"
        :to="item.href"
        class="focus-visible:outline-focus-ring inline-flex min-h-11 items-center underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {{ item.label }}
      </RouterLink>
      <span v-else>{{ item.label }}</span>
    </li>
  </ul>
</template>
