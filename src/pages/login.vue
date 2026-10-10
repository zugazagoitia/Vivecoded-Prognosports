<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

definePage({
  meta: {
    layout: 'empty',
    title: 'route.login',
  },
})

const route = useRoute()
// §2.8: set by the router when the token expired. A1 owns the rest of this page.
const expired = computed(() => route.query.expired === '1')
</script>

<template>
  <h1>Iniciar sesión</h1>
  <p v-if="expired" role="alert">
    Tu sesión ha caducado. Inicia sesión otra vez y volverás justo donde estabas.
  </p>
  <p>Pendiente de implementar.</p>
</template>
