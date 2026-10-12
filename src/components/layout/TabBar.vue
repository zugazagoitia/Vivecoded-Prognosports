<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import { useKeyboardOpen } from '@/composables/useKeyboardOpen'
import { useMobileNav, type TabId } from '@/composables/useMobileNav'

/** Bottom bar with the five main destinations (N2). Visible up to 900px; the desktop nav (AppNav) starts at 901px. */
const props = defineProps<{ active?: TabId | null }>()

const { t } = useI18n()
const nav = useMobileNav()
const keyboardOpen = useKeyboardOpen()
const current = computed(() => (props.active === undefined ? nav.active.value : props.active))
</script>

<template>
  <nav
    class="tab-bar"
    :class="{ 'tab-bar-hidden': keyboardOpen }"
    :aria-label="t('mobileNav.tabsLabel')"
  >
    <RouterLink
      v-for="tab in nav.tabs.value"
      :key="tab.id"
      :to="tab.to"
      class="tab-bar-item"
      :class="{ 'tab-bar-item-on': current === tab.id }"
      :aria-current="current === tab.id ? 'page' : undefined"
    >
      <PIcon :name="tab.icon" :size="20" />
      <span>{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style>
:root {
  --tab-bar-h: 64px;
}
.tab-bar {
  position: fixed;
  inset: auto 0 0;
  z-index: 40;
  display: none;
  height: calc(var(--tab-bar-h) + env(safe-area-inset-bottom, 0px));
  padding: 0 env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px)
    env(safe-area-inset-left, 0px);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}
.tab-bar-item {
  display: flex;
  flex: 1 1 0;
  min-width: 44px;
  min-height: 44px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  color: var(--color-muted);
  text-decoration: none;
}
.tab-bar-item-on {
  color: var(--color-link);
  font-weight: 600;
}
.tab-bar-item:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: -4px;
}
@media (width < 901px) {
  .tab-bar {
    display: flex;
  }
  .tab-bar-hidden {
    display: none;
  }
}
/* The layout reserves the bar's height so no content ends up behind it. */
@media (width < 901px) {
  .layout-app-tabs {
    padding-bottom: calc(var(--tab-bar-h) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
