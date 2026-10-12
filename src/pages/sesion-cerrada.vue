<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
definePage({
  meta: {
    layout: 'empty',
    title: 'route.loggedOut',
  },
})
</script>

<template>
  <section class="state">
    <h1>{{ t('pageState.loggedOut.title') }}</h1>
    <p>{{ t('pageState.loggedOut.text') }}</p>
    <RouterLink class="btn" to="/login">{{ t('pageState.loggedOut.action') }}</RouterLink>
  </section>
</template>
