<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/ui/AppLogo.vue'
import PTag from '@/components/ui/PTag.vue'
import { focusRing } from '@/components/ui/styles'
import { formatDate } from '@/utils/dates'
import { NAV_PATHS } from './useNavLinks'

const { t } = useI18n()
const isBeta = import.meta.env.MODE === 'beta'

const build = t('nav.footer.build', {
  version: import.meta.env.VITE_APP_VERSION,
  sha: String(import.meta.env.VITE_GIT_SHA).slice(0, 7),
  date: formatDate(String(import.meta.env.VITE_GIT_DATE)),
})

// «Contacto» points to the FAQ until a contact page exists (open question, N1).
const columns = [
  {
    title: 'nav.footer.game',
    links: [
      ['nav.links.rules', NAV_PATHS.rules],
      ['nav.links.circuits', NAV_PATHS.circuits],
      ['nav.footer.calendar', NAV_PATHS.gps],
      ['nav.footer.openCommunities', NAV_PATHS.explore],
    ],
  },
  {
    title: 'nav.footer.help',
    links: [
      ['nav.links.faq', NAV_PATHS.faq],
      ['nav.footer.gameRules', NAV_PATHS.rules],
      ['nav.footer.contact', NAV_PATHS.faq],
    ],
  },
  {
    title: 'nav.footer.legal',
    links: [
      ['nav.footer.terms', NAV_PATHS.terms],
      ['nav.footer.privacy', NAV_PATHS.privacy],
    ],
  },
] as const
</script>

<template>
  <footer class="bg-surface-muted border-border mt-auto border-t">
    <div class="mx-auto w-full max-w-(--container-xl) px-4 py-10 sm:px-6">
      <div class="grid gap-8 min-[900px]:grid-cols-[1.4fr_1fr_1fr_1fr] sm:grid-cols-2">
        <div class="flex flex-col items-start gap-3">
          <AppLogo :size="28" />
          <p class="text-muted m-0 max-w-xs text-sm">{{ t('nav.footer.tagline') }}</p>
          <PTag v-if="isBeta" color="brand">{{ t('nav.footer.beta') }}</PTag>
        </div>
        <div v-for="c in columns" :key="c.title">
          <h2 class="text-heading mb-2 text-xs font-semibold tracking-wide uppercase">
            {{ t(c.title) }}
          </h2>
          <ul class="m-0 flex list-none flex-col p-0">
            <li v-for="[label, to] in c.links" :key="label">
              <RouterLink
                :to="to"
                :class="[
                  'text-body hover:text-heading inline-flex min-h-11 items-center text-sm no-underline hover:underline',
                  focusRing,
                ]"
              >
                {{ t(label) }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
      <div
        class="border-border text-muted mt-8 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:justify-between"
      >
        <p class="m-0">{{ t('nav.footer.copyright', { year: new Date().getFullYear() }) }}</p>
        <p class="m-0">{{ build }}</p>
      </div>
    </div>
  </footer>
</template>
