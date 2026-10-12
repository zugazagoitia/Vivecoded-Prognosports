<script setup lang="ts">
import { useMutationObserver } from '@vueuse/core'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNav from '@/components/layout/AppNav.vue'
import PButton from '@/components/ui/PButton.vue'
import { useThemeStore } from '@/stores/theme'

/**
 * Shell for the auth screens (A1-A5), meant for the `empty` layout.
 *
 * Desktop (>= 640px): `AppNav` (visitor) + centred max-w-6xl `main` area. With the `aside`
 * slot, two columns from 768px: the default slot (form card column) and the side panel
 * (hidden below 768px). Phone (< 640px): no AppNav; a 56px header with «Volver» (to `backTo`,
 * default `/`) and the theme button, then the default slot at 16px gutters.
 * The default slot owns the card/phone body markup; this component only provides the frame.
 */
withDefaults(defineProps<{ backTo?: string }>(), { backTo: '/' })

const { t } = useI18n()
const theme = useThemeStore()

const root = globalThis.document?.documentElement
const isDark = ref(root?.dataset.theme === 'dark')
if (root) {
  useMutationObserver(
    root,
    () => {
      isDark.value = root.dataset.theme === 'dark'
    },
    { attributes: true, attributeFilter: ['data-theme'] },
  )
}
</script>

<template>
  <div class="bg-page flex min-h-dvh flex-col">
    <AppNav class="max-sm:hidden" />
    <div class="bg-surface border-border flex min-h-14 items-center gap-2 border-b px-3 sm:hidden">
      <PButton
        variant="ghost"
        icon="arrow-left"
        icon-only
        :to="backTo"
        :aria-label="t('auth.shell.back')"
      />
      <span class="flex-1" />
      <PButton
        variant="ghost"
        :icon="isDark ? 'sun' : 'moon'"
        icon-only
        :aria-label="t('auth.shell.theme')"
        @click="theme.set(isDark ? 'light' : 'dark')"
      />
    </div>
    <div
      class="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-start px-4 pt-6 pb-6 sm:justify-center sm:px-6 sm:py-10"
    >
      <div :class="['grid items-stretch gap-8', $slots.aside ? 'md:grid-cols-2' : '']">
        <div class="flex flex-col justify-center gap-6 sm:py-4">
          <slot />
        </div>
        <aside v-if="$slots.aside" class="max-md:hidden">
          <slot name="aside" />
        </aside>
      </div>
    </div>
  </div>
</template>
