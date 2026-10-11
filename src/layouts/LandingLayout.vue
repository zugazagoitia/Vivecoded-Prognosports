<script setup lang="ts">
// Layout "landing": AppNav visitante + SiteFooter
import AppNav from '@/components/layout/AppNav.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
</script>

<template>
  <div class="layout layout-landing flex min-h-screen flex-col">
    <AppNav />
    <main id="contenido" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
