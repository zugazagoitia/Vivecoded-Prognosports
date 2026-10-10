<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppLogo from '@/components/ui/AppLogo.vue'
import PButton from '@/components/ui/PButton.vue'
import { useThemeStore } from '@/stores/theme'

/** Mobile header (N2): logo or «Volver», view title, theme and notifications. */
const props = withDefaults(
  defineProps<{
    title?: string
    back?: boolean
    /** Fixed destination of «Volver»; without it, history if any, else `fallbackHref`. */
    backHref?: string
    fallbackHref?: string
  }>(),
  { title: undefined, back: false, backHref: undefined, fallbackHref: '/home' },
)

const { t } = useI18n()
const router = useRouter()
const theme = useThemeStore()

const dark = ref(false)
let observer: MutationObserver | undefined
function readDark() {
  dark.value = document.documentElement.classList.contains('dark')
}
onMounted(() => {
  readDark()
  observer = new MutationObserver(readDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => observer?.disconnect())

function toggleTheme() {
  theme.set(dark.value ? 'light' : 'dark')
}

function goBack() {
  // `history.state.back` is set by vue-router when the previous entry is inside the app.
  const state = globalThis.history.state as { back?: string | null } | null
  if (state?.back) router.back()
  else void router.push(props.fallbackHref)
}
</script>

<template>
  <header class="mobile-bar">
    <PButton
      v-if="back && backHref"
      variant="ghost"
      icon="arrow-left"
      icon-only
      :to="backHref"
      :aria-label="t('mobileNav.back')"
    />
    <PButton
      v-else-if="back"
      variant="ghost"
      icon="arrow-left"
      icon-only
      :aria-label="t('mobileNav.back')"
      @click="goBack"
    />
    <AppLogo v-else :size="28" :wordmark="false" />
    <span class="mobile-bar-title">{{ title ?? t('mobileNav.defaultTitle') }}</span>
    <PButton
      variant="ghost"
      :icon="dark ? 'sun' : 'moon'"
      icon-only
      :aria-label="t('mobileNav.theme')"
      @click="toggleTheme"
    />
    <PButton
      variant="ghost"
      icon="bell"
      icon-only
      to="/ajustes#avisos"
      :aria-label="t('mobileNav.notifications')"
    />
  </header>
</template>

<style>
.mobile-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: none;
  align-items: center;
  gap: 8px;
  min-height: calc(56px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 12px 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.mobile-bar-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: 17px;
  line-height: 24px;
  font-weight: 600;
  color: var(--color-heading);
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 900px) {
  .mobile-bar {
    display: flex;
  }
}
</style>
