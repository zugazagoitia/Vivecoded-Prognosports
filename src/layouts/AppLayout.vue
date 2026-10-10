<script setup lang="ts">
// Layout "app": AppNav/MobileBar/TabBar + SiteFooter
// --- N2 (MobileBar + TabBar) ---
import MobileBar from '@/components/layout/MobileBar.vue'
import TabBar from '@/components/layout/TabBar.vue'
import { useMobileNav } from '@/composables/useMobileNav'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const mobile = useMobileNav()
// --- /N2 ---
</script>

<template>
  <div class="layout layout-app" :class="{ 'layout-app-tabs': session.isAuthenticated }">
    <!-- TODO(N1): AppNav + SiteFooter -->
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
    <!-- N2 -->
    <TabBar v-if="session.isAuthenticated" />
    <!-- /N2 -->
  </div>
</template>
