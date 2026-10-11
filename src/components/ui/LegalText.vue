<script setup lang="ts">
import { computed } from 'vue'
import { legalSegments } from '@/content/legal'

const props = defineProps<{ text: string }>()
const segments = computed(() => legalSegments(props.text))
</script>

<template>
  <template v-for="(s, i) in segments" :key="i">
    <span v-if="s.ph" class="ph">{{ s.text }}</span>
    <template v-else>{{ s.text }}</template>
  </template>
</template>
