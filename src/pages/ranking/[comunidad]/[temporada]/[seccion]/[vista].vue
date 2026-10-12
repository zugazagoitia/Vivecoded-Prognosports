<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import RankingPage from '@/components/ranking/RankingPage.vue'

/**
 * `/ranking/:comunidad/:temporada/:seccion/:vista`. The flag of each view is checked by the
 * router guard (N3 `flagForRoute`) before this page or any screen chunk is loaded.
 */
definePage({
  meta: {
    layout: 'app',
    title: 'route.ranking',
    guards: ['auth', 'verified', 'community'],
  },
})

const route = useRoute('/ranking/[comunidad]/[temporada]/[seccion]/[vista]')
const seccion = computed(() => String(route.params.seccion))
const vista = computed(() => String(route.params.vista))
</script>

<template>
  <RankingPage :seccion="seccion" :vista="vista" />
</template>
