<script setup lang="ts">
import RankingPage from '@/components/ranking/RankingPage.vue'

/** `/ranking/:comunidad/:temporada`: the summary (R0), same as `/…/resumen`. */
definePage({
  meta: {
    layout: 'app',
    title: 'route.ranking',
    guards: ['auth', 'verified', 'community'],
  },
})
</script>

<template>
  <RankingPage seccion="resumen" />
</template>
