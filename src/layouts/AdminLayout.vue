<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import AdminSide from '@/components/layout/AdminSide.vue'
import { activeAdminItem } from '@/components/layout/adminNav'
import AppNav from '@/components/layout/AppNav.vue'
import MobileBar from '@/components/layout/MobileBar.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import TabBar from '@/components/layout/TabBar.vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import { adminExtraCrumbs } from '@/composables/useAdminCrumbs'

// Layout "admin": AppNav + main(AdminSide | content) + SiteFooter; MobileBar on phones.
// Only reachable through the `admin` guard (router) — non-admins get the 404 before this renders.
interface Crumb {
  label: string
  to?: RouteLocationRaw
}

const { t } = useI18n()
const route = useRoute()

const crumbs = computed<Crumb[]>(() => {
  const item = activeAdminItem(route.path)
  const list: Crumb[] = [{ label: t('admin.title'), to: '/admin' }]
  if (item && item.id !== 'panel') {
    const atRoot = route.path.replace(/\/+$/, '') === item.to
    list.push(atRoot ? { label: t(item.label) } : { label: t(item.label), to: item.to })
  }
  // Pages may append deeper crumbs (i18n keys) through route.meta.breadcrumb.
  for (const key of route.meta.breadcrumb ?? []) list.push({ label: t(key) })
  // Pages with data-dependent crumbs (GP name...) publish them through `useAdminCrumbs`.
  list.push(...adminExtraCrumbs.value)
  return list
})

// «Volver» on phones: sub-screens go back to the admin index, the index goes home.
const atAdminRoot = computed(() => route.path.replace(/\/+$/, '') === '/admin')
</script>

<template>
  <div class="layout layout-admin layout-app-tabs">
    <AppNav />
    <MobileBar :title="t('admin.title')" back :back-href="atAdminRoot ? '/home' : '/admin'" />
    <main id="contenido" tabindex="-1" class="mx-auto w-full max-w-6xl px-4 py-6">
      <Breadcrumb class="mb-4" :items="crumbs" />
      <div class="side-l">
        <!-- Phones (<640px) reach admin through the profile and M1's section index: no side menu. -->
        <div class="max-sm:hidden">
          <AdminSide />
        </div>
        <div class="min-w-0">
          <slot />
        </div>
      </div>
    </main>
    <SiteFooter />
    <TabBar active="profile" />
  </div>
</template>
