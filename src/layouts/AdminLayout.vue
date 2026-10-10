<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AdminSide from '@/components/layout/AdminSide.vue'
import { activeAdminItem } from '@/components/layout/adminNav'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'

// Layout "admin": AppNav (Administración active) + main(AdminSide | content) + SiteFooter.
// Only reachable through the `admin` guard (router) — non-admins get the 404 before this renders.
interface Crumb {
  label: string
  to?: string
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
  return list
})
</script>

<template>
  <div class="layout layout-admin">
    <!-- TODO(N1): <AppNav active="admin" /> (desktop). TODO(N2): MobileBar with «Volver» to /admin on phones. -->
    <main id="contenido" tabindex="-1" class="mx-auto w-full max-w-6xl px-4 py-6">
      <Breadcrumb class="mb-4" :items="crumbs" />
      <div class="side-l">
        <!-- Phones (<640px) reach admin through the profile and M1's section index: no side menu. -->
        <div class="hidden sm:block">
          <AdminSide />
        </div>
        <div class="min-w-0">
          <slot />
        </div>
      </div>
    </main>
    <!-- TODO(N1): <SiteFooter /> -->
  </div>
</template>
