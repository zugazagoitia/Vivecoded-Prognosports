<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GpEditor from '@/components/admin/GpEditor.vue'

/** M3 · ficha de un Gran Premio (`/admin/gps/:competicion/:temporada/:gp`). */
definePage({ meta: { title: 'route.adminGp' } })

const route = useRoute('/admin/gps/[competicion]/[temporada]/[gp]/')
const p = computed(() => route.params)
</script>

<template>
  <GpEditor :key="p.gp" :competition="p.competicion" :season="p.temporada" :gp-param="p.gp" />
</template>
