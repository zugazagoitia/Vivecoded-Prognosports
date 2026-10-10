<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const { t } = useI18n()
const theme = useThemeStore()

const options: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'theme.light' },
  { mode: 'dark', label: 'theme.dark' },
  { mode: 'system', label: 'theme.system' },
]
</script>

<template>
  <div
    role="group"
    :aria-label="t('theme.label')"
    class="bg-surface-muted ring-border inline-flex gap-0.5 rounded-lg p-1 ring-1"
  >
    <button
      v-for="o in options"
      :key="o.mode"
      type="button"
      :aria-pressed="theme.mode === o.mode"
      class="text-muted hover:text-heading focus-visible:outline-focus-ring aria-pressed:bg-surface aria-pressed:text-heading inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 aria-pressed:shadow-sm md:min-h-0"
      @click="theme.set(o.mode)"
    >
      {{ t(o.label) }}
    </button>
  </div>
</template>
