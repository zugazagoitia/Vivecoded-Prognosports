<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { passwordScore, strengthColor, strengthLabel } from './passwordStrength'

/** Strength meter: 4 decorative segments + the level as text in a polite live region. */
const props = defineProps<{ password: string }>()
const { t } = useI18n()

const score = computed(() => passwordScore(props.password))
const tone = computed(() => strengthColor(score.value))
const fill = { err: 'bg-err', warn: 'bg-warn', ok: 'bg-ok' } as const
</script>

<template>
  <div class="flex flex-col gap-1.5" data-testid="password-meter" :data-score="score">
    <div class="grid grid-cols-4 gap-1" aria-hidden="true">
      <span
        v-for="i in 4"
        :key="i"
        data-testid="meter-seg"
        class="h-1 rounded-xs"
        :class="score >= i ? fill[tone] : 'bg-border'"
      />
    </div>
    <p role="status" class="text-muted text-xs leading-4">
      {{ t('register.strength.text', { level: strengthLabel(score) }) }}
    </p>
  </div>
</template>
