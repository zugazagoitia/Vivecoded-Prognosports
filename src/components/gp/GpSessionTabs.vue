<script setup lang="ts">
import { computed } from 'vue'
import { TabsList, TabsTrigger } from 'reka-ui'
import PTag from '@/components/ui/PTag.vue'
import { focusRing } from '@/components/ui/styles'
import type { SessionVm } from './types'

/**
 * Timeline of the weekend sessions: one tab per session (bar, name, time, state tag). Must be
 * rendered inside a Reka `TabsRoot` whose value is the selected session id (arrow keys move
 * between tabs). Up to 4 columns; 2 columns on narrow screens.
 */
const props = defineProps<{ sessions: SessionVm[]; label: string }>()
const cols = computed(() => ({ '--cols': Math.min(Math.max(props.sessions.length, 1), 4) }))
</script>

<template>
  <TabsList
    :aria-label="label"
    class="tline grid grid-cols-2 gap-x-0 gap-y-4 p-5 min-[701px]:grid-cols-(--cols)"
    :style="cols"
  >
    <TabsTrigger
      v-for="s in sessions"
      :key="s.session.id"
      :value="String(s.session.id)"
      :class="[
        'hover:bg-surface-hover data-[state=active]:bg-tint flex min-h-11 cursor-pointer flex-col items-start gap-1.5 rounded-lg px-3 py-2.5 text-left',
        focusRing,
      ]"
    >
      <span
        class="h-1 w-full rounded-full"
        :class="{
          'bg-ok': s.status.bar === 'done',
          'bg-warn': s.status.bar === 'now',
          'bg-surface-muted': !s.status.bar,
        }"
        aria-hidden="true"
      />
      <b class="text-heading font-semibold">{{ s.name }}</b>
      <span class="text-muted text-xs">{{ s.when }}</span>
      <PTag :color="s.status.color">{{ s.statusText }}</PTag>
    </TabsTrigger>
  </TabsList>
</template>
