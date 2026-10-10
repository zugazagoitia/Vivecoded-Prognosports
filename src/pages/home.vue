<script setup lang="ts">
definePage({
  meta: {
    layout: 'app',
    title: 'route.home',
    guards: ['auth', 'verified', 'community'],
  },
})
</script>

<template>
  <h1>Inicio</h1>
  <p>Pendiente de implementar.</p>
</template>
