<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'

const { t } = useI18n()
definePage({
  meta: {
    layout: 'empty',
    title: 'route.loggedOut',
  },
})
</script>

<template>
  <section
    class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center"
  >
    <h1 class="text-heading text-2xl font-bold">{{ t('pageState.loggedOut.title') }}</h1>
    <p class="text-body">{{ t('pageState.loggedOut.text') }}</p>
    <PButton to="/login">{{ t('pageState.loggedOut.action') }}</PButton>
  </section>
</template>
