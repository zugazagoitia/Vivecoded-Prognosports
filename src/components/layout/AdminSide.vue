<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'
import { activeAdminItem, ADMIN_GROUPS } from './adminNav'

const { t } = useI18n()
const route = useRoute()
const active = computed(() => activeAdminItem(route.path)?.id)
</script>

<template>
  <!-- Sticky from the 900px collapse up (top 72px = navbar height); in flow above the content below it. -->
  <nav
    :aria-label="t('admin.nav.label')"
    class="bg-surface ring-card-ring flex flex-col gap-3 rounded-lg p-3 shadow-sm ring-1 min-[901px]:sticky min-[901px]:top-[72px]"
  >
    <div
      v-for="g in ADMIN_GROUPS"
      :key="g.id"
      role="group"
      class="flex flex-col gap-0.5"
      :aria-labelledby="`admin-nav-${g.id}`"
    >
      <span
        :id="`admin-nav-${g.id}`"
        class="text-muted px-2.5 py-1.5 text-xs font-semibold tracking-wider uppercase"
        >{{ t(g.label) }}</span
      >
      <RouterLink
        v-for="it in g.items"
        :key="it.id"
        :to="it.to"
        :aria-current="active === it.id ? 'page' : undefined"
        :class="[
          'flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm no-underline hover:no-underline',
          focusRing,
          active === it.id
            ? 'bg-tint text-tint-fg font-semibold'
            : 'text-body hover:bg-surface-muted hover:text-heading',
        ]"
      >
        <PIcon
          :name="it.icon"
          :size="20"
          :class="active === it.id ? 'text-tint-fg' : 'text-muted'"
        />
        {{ t(it.label) }}
      </RouterLink>
    </div>
  </nav>
</template>
