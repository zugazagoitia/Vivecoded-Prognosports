<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import { CONTACT_EMAIL } from '@/content/contact'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToast()
const { copy } = useClipboard({ legacy: true })

async function copyEmail() {
  try {
    await copy(CONTACT_EMAIL)
    toast.success(t('faq.contact.copied'))
  } catch {
    // The address stays visible and selectable as a mailto link.
    toast.error(t('faq.contact.copyFailed'), t('faq.contact.copyFailedText'))
  }
}
</script>

<template>
  <section
    class="bg-tint ring-card-ring flex flex-wrap items-center justify-between gap-4 rounded-lg p-5 ring-1"
    aria-labelledby="faq-contact-title"
  >
    <div class="flex flex-col gap-0.5">
      <h2 id="faq-contact-title" class="t-header text-heading">{{ t('faq.contact.title') }}</h2>
      <p class="text-tint-fg text-sm">{{ t('faq.contact.text') }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <a
        :href="`mailto:${CONTACT_EMAIL}`"
        class="text-heading inline-flex min-h-11 items-center text-sm font-bold select-all"
        >{{ CONTACT_EMAIL }}</a
      >
      <PButton size="sm" icon="copy" @click="copyEmail">{{ t('faq.contact.copy') }}</PButton>
    </div>
  </section>
</template>
