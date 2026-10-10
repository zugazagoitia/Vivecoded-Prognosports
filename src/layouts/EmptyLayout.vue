<script setup lang="ts">
// Layout "empty": sin navegación (login, registro, errores)
</script>

<template>
  <div class="layout layout-empty">
    <!-- TODO(N1-N4): sin navegación (login, registro, errores) -->
    <main id="contenido" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
