<script setup lang="ts">
import { useFlag, type FlagName } from './index'

const props = defineProps<{ name: FlagName }>()
const enabled = useFlag(props.name)
</script>

<template>
  <slot v-if="enabled" />
</template>
