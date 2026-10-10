<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import LandingCta from '@/components/landing/LandingCta.vue'
import LandingExample from '@/components/landing/LandingExample.vue'
import LandingFaq from '@/components/landing/LandingFaq.vue'
import LandingFeatures from '@/components/landing/LandingFeatures.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingMobileChrome from '@/components/landing/LandingMobileChrome.vue'
import LandingRanking from '@/components/landing/LandingRanking.vue'
import LandingSteps from '@/components/landing/LandingSteps.vue'

definePage({
  meta: {
    layout: 'landing',
    title: 'route.landing',
    guards: ['home'],
    // Phones get their own header and footer (LandingMovil): the layout hides AppNav/SiteFooter.
    ownMobileChrome: true,
  },
})

// Below 640 px the page renders the dedicated phone design (different copy and blocks).
const mobile = useMediaQuery('(max-width: 639px)')
</script>

<template>
  <div v-if="mobile" data-variant="mobile">
    <LandingMobileChrome part="header" />
    <LandingHero mobile />
    <LandingSteps mobile />
    <LandingRanking mobile />
    <LandingFeatures mobile />
    <LandingCta mobile />
    <LandingMobileChrome part="footer" />
  </div>
  <div v-else data-variant="desktop">
    <LandingHero />
    <LandingSteps />
    <LandingExample />
    <LandingRanking />
    <LandingFeatures />
    <LandingFaq />
    <LandingCta />
  </div>
</template>
