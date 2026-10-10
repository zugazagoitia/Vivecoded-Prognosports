<script setup lang="ts">
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'

/**
 * Accessible tooltip: opens on hover and keyboard focus, closes with Escape, and is linked to the
 * trigger with `aria-describedby` (never the `title` attribute). The default slot must be ONE
 * focusable element (button, link, input...).
 */
withDefaults(defineProps<{ content: string; side?: 'top' | 'right' | 'bottom' | 'left' }>(), {
  side: 'top',
})
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side="side"
          :side-offset="6"
          class="bg-heading text-surface z-50 max-w-64 rounded-md px-2.5 py-2 text-xs leading-4 shadow-lg"
        >
          {{ content }}
          <TooltipArrow class="fill-heading" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
