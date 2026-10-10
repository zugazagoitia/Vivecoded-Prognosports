<script setup lang="ts">
// Layout "app": AppNav/MobileBar/TabBar + SiteFooter
import AppNav from '@/components/layout/AppNav.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
</script>

<template>
  <div class="layout layout-app flex min-h-screen flex-col">
    <!-- N1: AppNav -->
    <AppNav />
    <!-- /N1 -->
    <main id="contenido" tabindex="-1">
      <slot />
    </main>
    <!-- N1: SiteFooter -->
    <SiteFooter />
    <!-- /N1 -->
  </div>
</template>
