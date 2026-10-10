<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from 'reka-ui'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'
import { FAQ_CATEGORIES, type FaqItem } from '@/content/faq'

/** FAQ accordion: one answer open at a time, all closable. `open` is the id of the open item. */
defineProps<{ items: FaqItem[]; ids: string[] }>()
const open = defineModel<string>('open', { default: '' })
</script>

<template>
  <AccordionRoot v-model="open" type="single" collapsible :unmount-on-hide="false">
    <AccordionItem
      v-for="(item, i) in items"
      :id="ids[i]"
      :key="ids[i]"
      :value="ids[i] ?? ''"
      class="border-border border-b last:border-b-0"
    >
      <AccordionHeader as="h2">
        <AccordionTrigger
          :class="[
            'text-heading hover:bg-surface-muted group flex min-h-11 w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold',
            focusRing,
          ]"
        >
          <span class="flex min-w-0 flex-col gap-0.5">
            <span>{{ item.question }}</span>
            <span class="t-caption text-muted font-medium">{{
              FAQ_CATEGORIES[item.category]
            }}</span>
          </span>
          <PIcon
            :name="open === ids[i] ? 'minus' : 'plus'"
            :size="16"
            class="text-muted shrink-0"
          />
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent>
        <p class="text-muted max-w-170 px-5 pb-5">{{ item.answer }}</p>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
