<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/ui/AppLogo.vue'
import PButton from '@/components/ui/PButton.vue'
import { focusRing } from '@/components/ui/styles'

/** Phone-only landing chrome: own header (no theme switch) or simplified footer. */
defineProps<{ part: 'header' | 'footer' }>()
const { t } = useI18n()

const links = [
  ['landing.mobile.faq', '/faq'],
  ['landing.mobile.rules', '/rules'],
  ['landing.mobile.circuits', '/circuits'],
  ['landing.mobile.legal', '/terms'],
] as const

const build = t('landing.mobile.build', {
  version: import.meta.env.VITE_APP_VERSION,
  sha: String(import.meta.env.VITE_GIT_SHA).slice(0, 7),
})
</script>

<template>
  <div
    v-if="part === 'header'"
    class="bg-surface border-border flex min-h-14 items-center gap-2 border-b px-4"
  >
    <RouterLink to="/" :class="['mr-auto rounded-sm', focusRing]">
      <AppLogo :size="28" />
    </RouterLink>
    <PButton to="/login" variant="ghost" size="sm">{{ t('landing.mobile.enter') }}</PButton>
    <PButton to="/register" size="sm">{{ t('landing.mobile.register') }}</PButton>
  </div>
  <div
    v-else
    class="bg-surface border-border text-muted flex flex-col gap-3 border-t px-4 py-6 text-sm"
  >
    <AppLogo :size="28" />
    <nav :aria-label="t('landing.mobile.links')" class="flex flex-wrap gap-x-4">
      <RouterLink
        v-for="[label, to] in links"
        :key="to"
        :to="to"
        :class="['text-body inline-flex min-h-11 items-center rounded-sm', focusRing]"
      >
        {{ t(label) }}
      </RouterLink>
    </nav>
    <span class="text-xs tabular-nums">{{ build }}</span>
  </div>
</template>
