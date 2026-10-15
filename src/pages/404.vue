<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'

const { t } = useI18n()
definePage({
  meta: {
    layout: 'empty',
    title: 'route.notFound',
  },
})
</script>

<template>
  <section
    class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center"
  >
    <p class="text-primary text-5xl font-bold">404</p>
    <h1 class="text-heading text-2xl font-bold">{{ t('pageState.notFound.title') }}</h1>
    <p class="text-body">{{ t('pageState.notFound.text') }}</p>
    <PButton to="/">{{ t('pageState.notFound.action') }}</PButton>
  </section>
</template>
