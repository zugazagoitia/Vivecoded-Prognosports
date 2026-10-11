<script setup lang="ts">
import { useRoute } from 'vue-router'
import CircuitEditor from '@/components/admin/CircuitEditor.vue'

/** M7 · edición de un circuito (`/admin/circuitos/:circuit`). */
definePage({ meta: { title: 'route.adminCircuit' } })

const route = useRoute('/admin/circuitos/[circuit]')
</script>

<template>
  <CircuitEditor :key="route.params.circuit" :circuit="route.params.circuit" />
</template>
