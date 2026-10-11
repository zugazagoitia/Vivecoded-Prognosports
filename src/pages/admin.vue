<script setup lang="ts">
definePage({
  meta: {
    layout: 'admin',
    title: 'route.admin',
    guards: ['auth', 'verified', 'community', 'admin'],
  },
})
</script>

<template>
  <RouterView />
</template>
