<script setup lang="ts">
import { TabsList, TabsTrigger } from 'reka-ui'
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'
import type { PredictTab } from './usePredict'

/**
 * Session tabs. Desktop: a Reka tablist (arrow keys move between tabs; must live inside a
 * `TabsRoot` whose value is the session id). Phone: chips as plain toggle buttons.
 */
defineProps<{ tabs: PredictTab[]; selected: number; mobile?: boolean }>()
const emit = defineEmits<{ select: [id: number] }>()
const { t } = useI18n()

const dot = { done: 'bg-ok', now: 'bg-warn', rest: 'bg-series-rest' } as const
</script>

<template>
  <div
    v-if="mobile"
    class="-mx-4 overflow-x-auto px-4"
    :aria-label="t('predict.tabs.label')"
    role="group"
  >
    <ul class="m-0 flex list-none gap-2 p-0">
      <li v-for="s in tabs" :key="s.id" class="shrink-0">
        <button
          type="button"
          :aria-pressed="s.id === selected"
          :aria-current="s.id === selected ? 'true' : undefined"
          :class="[
            'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap',
            focusRing,
            s.id === selected
              ? 'bg-primary text-on-primary'
              : s.dot === 'done'
                ? 'bg-ok-tint text-ok-fg'
                : 'bg-surface-muted text-body',
          ]"
          @click="emit('select', s.id)"
        >
          <PIcon v-if="s.dot === 'done'" name="check" :size="16" />
          {{ s.short }}
          <span v-if="s.hasPrediction && s.dot !== 'done'" class="sr-only">{{
            ` ${t('predict.tabs.saved')}`
          }}</span>
        </button>
      </li>
    </ul>
  </div>
  <TabsList
    v-else
    :aria-label="t('predict.tabs.label')"
    class="bg-surface ring-card-ring grid grid-cols-2 gap-1.5 rounded-lg p-1.5 shadow-(--card-shadow) ring-1 min-[901px]:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
    :style="{ '--cols': Math.min(Math.max(tabs.length, 1), 4) }"
  >
    <TabsTrigger
      v-for="s in tabs"
      :key="s.id"
      :value="String(s.id)"
      :class="[
        'hover:bg-surface-hover data-[state=active]:bg-tint flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-3.5 py-2.5 text-left',
        focusRing,
      ]"
    >
      <span aria-hidden="true" class="size-2.5 shrink-0 rounded-full" :class="dot[s.dot]" />
      <span class="flex min-w-0 flex-col">
        <b class="text-heading flex items-center gap-1.5 text-[15px] font-semibold">
          {{ s.name }}
          <PIcon
            v-if="s.hasPrediction"
            name="check"
            :size="16"
            class="text-ok-fg"
            aria-hidden="true"
          />
          <span v-if="s.hasPrediction" class="sr-only">{{ ` ${t('predict.tabs.saved')}` }}</span>
        </b>
        <span class="text-muted text-xs">{{ s.subtitle }}</span>
      </span>
    </TabsTrigger>
  </TabsList>
</template>
