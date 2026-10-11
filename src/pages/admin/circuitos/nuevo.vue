<script setup lang="ts">
import CircuitEditor from '@/components/admin/CircuitEditor.vue'

/** M7 · alta de circuito (`/admin/circuitos/nuevo`). */
definePage({ meta: { title: 'route.adminCircuit' } })
</script>

<template>
  <CircuitEditor />
</template>
