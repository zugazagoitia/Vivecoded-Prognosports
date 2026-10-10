<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import PIcon from './PIcon.vue'
import type { IconName } from './icons'
import { focusRing } from './styles'

export type MenuEntry =
  | { type: 'label'; label: string }
  | { type: 'separator' }
  | {
      type?: 'item'
      value: string
      label: string
      icon?: IconName
      /** Current option (highlighted, `aria-current`). */
      active?: boolean
      disabled?: boolean
    }

defineProps<{ entries: MenuEntry[]; align?: 'start' | 'center' | 'end' }>()
defineEmits<{ select: [value: string] }>()
</script>

<template>
  <!-- Non-modal: the page keeps its semantics (no aria-hidden on focusable siblings); Escape and outside click still close it. -->
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        :align="align ?? 'start'"
        :side-offset="6"
        class="bg-surface ring-card-ring z-50 flex min-w-52 flex-col rounded-lg p-1.5 shadow-lg ring-1"
      >
        <template v-for="(e, i) in entries" :key="i">
          <DropdownMenuSeparator
            v-if="e.type === 'separator'"
            class="bg-border -mx-1.5 my-1.5 h-px"
          />
          <DropdownMenuLabel
            v-else-if="e.type === 'label'"
            class="text-muted px-2.5 py-1.5 text-xs font-semibold tracking-wide uppercase"
          >
            {{ e.label }}
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-else
            :disabled="e.disabled"
            :aria-current="e.active ? 'true' : undefined"
            :class="[
              'text-body data-[highlighted]:bg-surface-muted data-[highlighted]:text-heading flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm leading-5 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 md:min-h-9',
              e.active ? 'bg-tint! text-tint-fg! font-semibold' : '',
              focusRing,
            ]"
            @select="$emit('select', e.value)"
          >
            <PIcon v-if="e.icon" :name="e.icon" :size="16" :class="e.active ? '' : 'text-muted'" />
            {{ e.label }}
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
