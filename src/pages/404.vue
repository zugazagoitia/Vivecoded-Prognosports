<script setup lang="ts">
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
    <h1>No se ha encontrado lo que buscabas</h1>
    <p>La página no existe o ha cambiado de sitio.</p>
    <RouterLink class="btn" to="/">Volver al inicio</RouterLink>
  </section>
</template>
