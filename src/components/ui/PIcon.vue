<script setup lang="ts">
import { computed } from 'vue'
import { iconDefinition, type IconName } from './icons'

const props = withDefaults(defineProps<{ name: IconName; size?: 16 | 20 | 24 }>(), { size: 20 })

const def = computed(() => iconDefinition(props.name))
const box = computed(() => {
  const [w, h] = def.value?.icon ?? [512, 512]
  return `0 0 ${w} ${h}`
})
const path = computed(() => {
  const p = def.value?.icon[4]
  return Array.isArray(p) ? p.join(' ') : (p ?? '')
})
</script>

<template>
  <!-- Decorative by default: when the icon is a button's only content, name the button. -->
  <svg
    class="p-icon"
    :width="size"
    :height="size"
    :viewBox="box"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" />
  </svg>
</template>

<style>
.p-icon {
  display: inline-block;
  flex: none;
  vertical-align: middle;
}
</style>
