<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import heroImage from '@/assets/landing/hero.svg'
import AppImage from '@/components/ui/AppImage.vue'
import PButton from '@/components/ui/PButton.vue'
import { focusRing } from '@/components/ui/styles'
import { useSessionStore } from '@/stores/session'
import { useSeasonYear } from './useSeasonYear'

defineProps<{ mobile?: boolean }>()
const { t } = useI18n()
const session = useSessionStore()
const year = useSeasonYear()

// Signed-in visitors (the guard normally redirects them first) get «Empezar a pronosticar» -> /home.
const primary = computed(() =>
  session.isAuthenticated
    ? { to: '/home', label: t('landing.hero.start') }
    : { to: '/register', label: t('landing.hero.register') },
)
const lightBtn = 'bg-white! text-brand-700! border-transparent! hover:bg-brand-50!'
const ghostBtn = 'bg-transparent! text-white! border-brand-300! hover:bg-white/10!'
</script>

<template>
  <section
    class="relative isolate overflow-hidden"
    :class="mobile ? '' : 'flex min-h-[600px] items-center'"
  >
    <!-- Decorative photo (placeholder until the licensed final file exists). -->
    <AppImage
      :src="heroImage"
      alt=""
      :width="1600"
      :height="900"
      eager
      aria-hidden="true"
      class="absolute inset-0 -z-20 size-full object-cover"
    />
    <div
      aria-hidden="true"
      class="absolute inset-0 -z-10"
      :class="
        mobile
          ? 'from-brand-900/55 via-brand-900/95 to-brand-900/95 bg-linear-to-b via-70%'
          : 'from-brand-900/95 via-brand-900/80 to-brand-900/35 bg-linear-to-r via-45%'
      "
    />
    <div
      class="mx-auto w-full max-w-(--container-xl)"
      :class="mobile ? 'px-4 pt-14 pb-10' : 'px-4 py-[72px] sm:px-6'"
    >
      <div class="flex flex-col items-start" :class="mobile ? 'gap-4' : 'max-w-[640px] gap-6'">
        <span
          class="text-brand-accent-100 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium"
        >
          {{ t('landing.pill', { year }) }}
        </span>
        <h1
          class="font-semibold text-balance text-white"
          :class="
            mobile
              ? 'text-[30px] leading-9 tracking-[-0.01em]'
              : 'text-5xl leading-[52px] tracking-[-0.02em]'
          "
        >
          {{ t('landing.hero.title') }}
        </h1>
        <p class="text-brand-100" :class="mobile ? '' : 'text-xl leading-[30px]'">
          {{ mobile ? t('landing.hero.textShort') : t('landing.hero.text') }}
        </p>
        <div class="flex flex-wrap gap-4" :class="mobile ? 'w-full flex-col' : ''">
          <PButton :to="primary.to" size="lg" :block="mobile" :class="lightBtn">
            {{ primary.label }}
          </PButton>
          <PButton to="/rules" size="lg" :block="mobile" :class="ghostBtn">
            {{ t('landing.hero.rules') }}
          </PButton>
        </div>
        <p v-if="!mobile && !session.isAuthenticated" class="text-brand-200 m-0 text-sm">
          {{ t('landing.hero.haveAccount') }}
          <RouterLink to="/login" :class="['rounded-sm text-white underline', focusRing]">
            {{ t('landing.hero.login') }}
          </RouterLink>
        </p>
      </div>
    </div>
  </section>
</template>
