<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import PIcon from './PIcon.vue'
import { focusRing } from './styles'

export interface Crumb {
  label: string
  to?: RouteLocationRaw
}

defineProps<{ items: Crumb[] }>()
const { t } = useI18n()
</script>

<template>
  <nav :aria-label="t('ui.breadcrumb')">
    <ol class="text-muted flex flex-wrap items-center gap-1.5 text-sm">
      <li v-for="(c, i) in items" :key="i" class="flex items-center gap-1.5">
        <PIcon v-if="i > 0" name="chevron-right" :size="16" />
        <span v-if="i === items.length - 1" aria-current="page" class="text-heading font-medium">{{
          c.label
        }}</span>
        <RouterLink
          v-else-if="c.to"
          :to="c.to"
          :class="[
            'hover:text-link -mx-1 inline-flex min-h-11 items-center rounded-sm px-1 md:min-h-6',
            focusRing,
          ]"
        >
          {{ c.label }}
        </RouterLink>
        <span v-else>{{ c.label }}</span>
      </li>
    </ol>
  </nav>
</template>
