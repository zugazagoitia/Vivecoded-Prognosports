<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import RankingPage from '@/components/ranking/RankingPage.vue'

/** `/ranking/:comunidad/:temporada/:seccion`: single-view sections (`resumen`, `palmares`). */
definePage({
  meta: {
    layout: 'app',
    title: 'route.ranking',
    guards: ['auth', 'verified', 'community'],
  },
})

const route = useRoute('/ranking/[comunidad]/[temporada]/[seccion]/')
const seccion = computed(() => String(route.params.seccion))
</script>

<template>
  <RankingPage :seccion="seccion" />
</template>
