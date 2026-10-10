<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { passwordChecks } from './reset'

const props = defineProps<{ password: string }>()
const { t } = useI18n()
const score = computed(() => passwordChecks(props.password).score)
const level = computed(() => ['none', 'weak', 'fair', 'good', 'strong'][score.value]!)
const colors = ['bg-err', 'bg-warn', 'bg-primary', 'bg-ok']
</script>

<template>
  <div v-if="password" class="flex items-center gap-3" data-testid="password-meter">
    <div class="flex flex-1 gap-1" aria-hidden="true">
      <span
        v-for="i in 4"
        :key="i"
        class="h-1.5 flex-1 rounded-sm"
        :class="i <= score ? colors[score - 1] : 'bg-border'"
      />
    </div>
    <p class="text-muted text-xs" role="status">
      {{ t('reset.strength.label') }}: {{ t(`reset.strength.${level}`) }}
    </p>
  </div>
</template>
