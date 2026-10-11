<script setup lang="ts">
// Layout "app": AppNav (desktop) + MobileBar/TabBar (mobile) + SiteFooter
import AppNav from '@/components/layout/AppNav.vue'
import MobileBar from '@/components/layout/MobileBar.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import TabBar from '@/components/layout/TabBar.vue'
import { useMobileNav } from '@/composables/useMobileNav'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const mobile = useMobileNav()
</script>

<template>
  <div
    class="layout layout-app flex min-h-screen flex-col"
    :class="{ 'layout-app-tabs': session.isAuthenticated }"
  >
    <!-- N1 -->
    <AppNav />
    <!-- /N1 -->
    <!-- N2 -->
    <MobileBar
      v-if="session.isAuthenticated"
      :title="mobile.title.value"
      :back="mobile.back.value"
      :back-href="mobile.backHref.value"
    />
    <!-- /N2 -->
    <main id="contenido" tabindex="-1">
      <slot />
    </main>
    <!-- N1 -->
    <SiteFooter />
    <!-- /N1 -->
    <!-- N2 -->
    <TabBar v-if="session.isAuthenticated" />
    <!-- /N2 -->
  </div>
</template>
