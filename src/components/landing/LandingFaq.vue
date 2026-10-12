<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from 'reka-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'

const { t } = useI18n()
// Single, collapsible; the first question starts open.
const open = ref<string | undefined>('0')
</script>

<template>
  <section class="bg-surface shadow-[0_1px_0_var(--color-border),0_-1px_0_var(--color-border)]">
    <div class="mx-auto w-full max-w-[900px] px-4 py-[72px] sm:px-6">
      <div class="mb-6 flex flex-col gap-2">
        <p class="t-up text-muted m-0">{{ t('landing.faq.eyebrow') }}</p>
        <h2 class="text-heading m-0 text-[30px] leading-[38px] font-semibold">
          {{ t('landing.faq.title') }}
        </h2>
      </div>
      <AccordionRoot v-model="open" type="single" collapsible>
        <AccordionItem
          v-for="(_, i) in 4"
          :key="i"
          :value="String(i)"
          class="border-border group border-b"
        >
          <AccordionHeader as="h3" class="m-0">
            <AccordionTrigger
              :class="[
                'text-heading flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 rounded-sm bg-transparent px-1 py-4 text-left text-base font-semibold',
                focusRing,
              ]"
            >
              {{ t(`landing.faq.list[${i}].q`) }}
              <PIcon :name="open === String(i) ? 'minus' : 'plus'" :size="20" class="flex-none" />
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent>
            <p class="text-muted m-0 max-w-[720px] px-1 pb-4">
              {{ t(`landing.faq.list[${i}].a`) }}
            </p>
          </AccordionContent>
        </AccordionItem>
      </AccordionRoot>
      <PButton to="/faq" variant="outline" class="mt-6">{{ t('landing.faq.all') }}</PButton>
    </div>
  </section>
</template>
