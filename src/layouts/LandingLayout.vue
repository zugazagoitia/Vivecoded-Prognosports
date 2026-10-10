<script setup lang="ts">
// Layout "landing": AppNav visitante + SiteFooter
</script>

<template>
  <div class="layout layout-landing">
    <!-- TODO(N1-N4): AppNav visitante + SiteFooter -->
    <main id="contenido" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
