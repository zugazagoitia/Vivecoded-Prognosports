<script setup lang="ts">
// Layout "app": AppNav/MobileBar/TabBar + SiteFooter
</script>

<template>
  <div class="layout layout-app">
    <!-- TODO(N1-N4): AppNav/MobileBar/TabBar + SiteFooter -->
    <main id="contenido" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
