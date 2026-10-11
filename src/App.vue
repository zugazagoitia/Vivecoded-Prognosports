<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BetaBanner from '@/components/layout/BetaBanner.vue'
import OfflineNotice from '@/components/layout/OfflineNotice.vue'
import AppToaster from '@/components/ui/AppToaster.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import EmptyLayout from '@/layouts/EmptyLayout.vue'
import LandingLayout from '@/layouts/LandingLayout.vue'
import { announcement } from '@/router/a11y'

const layouts = { landing: LandingLayout, app: AppLayout, admin: AdminLayout, empty: EmptyLayout }

const route = useRoute()
const layout = computed(() => layouts[route.meta.layout ?? 'app'])
</script>

<template>
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <BetaBanner />
  <OfflineNotice />
  <component :is="layout">
    <ErrorBoundary :key="route.fullPath">
      <RouterView />
    </ErrorBoundary>
  </component>
  <AppToaster />
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ announcement }}</div>
</template>

<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 0;
  top: 0;
  z-index: 1000;
  padding: 0.5rem 1rem;
  background: #fff;
}
</style>
