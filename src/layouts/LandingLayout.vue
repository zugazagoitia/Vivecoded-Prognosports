<script setup lang="ts">
// Layout "landing": AppNav visitante + SiteFooter
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from '@/components/layout/AppNav.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'

const route = useRoute()
// The home page draws its own phone header and footer (P1).
const hideOnPhone = computed(() => (route.meta.ownMobileChrome ? 'max-[639px]:hidden' : ''))
</script>

<template>
  <div class="layout layout-landing flex min-h-screen flex-col">
    <AppNav :class="hideOnPhone" />
    <main id="contenido" tabindex="-1">
      <slot />
    </main>
    <SiteFooter :class="hideOnPhone" />
  </div>
</template>
