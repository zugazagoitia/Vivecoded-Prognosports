<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
definePage({
  meta: {
    layout: 'empty',
    title: 'route.notFound',
  },
})
</script>

<template>
  <section class="state">
    <p class="code">404</p>
    <h1>{{ t('pageState.notFound.title') }}</h1>
    <p>{{ t('pageState.notFound.text') }}</p>
    <RouterLink class="btn" to="/">{{ t('pageState.notFound.action') }}</RouterLink>
  </section>
</template>
