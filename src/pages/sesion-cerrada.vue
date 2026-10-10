<script setup lang="ts">
definePage({
  meta: {
    layout: 'empty',
    title: 'route.loggedOut',
  },
})
</script>

<template>
  <section class="state">
    <h1>Has cerrado sesión</h1>
    <p>Hasta el próximo Gran Premio.</p>
    <RouterLink class="btn" to="/login">Volver a entrar</RouterLink>
  </section>
</template>
