<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'

/** A5 progress: «Cuenta creada» › «Verificar correo» › «Tu comunidad» as an ordered list. */
defineProps<{ verified?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <ol
    :aria-label="t('verify.stepsLabel')"
    class="text-muted m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0 text-sm"
  >
    <li class="flex items-center gap-2">
      <PTag color="ok" icon="check">
        {{ t('verify.steps.account')
        }}<span class="sr-only"> ({{ t('verify.steps.completed') }})</span>
      </PTag>
      <PIcon name="chevron-right" :size="16" aria-hidden="true" />
    </li>
    <li class="flex items-center gap-2" :aria-current="verified ? undefined : 'step'">
      <PTag :color="verified ? 'ok' : 'brand'" :icon="verified ? 'check' : undefined">
        {{ t('verify.steps.verify')
        }}<span v-if="verified" class="sr-only"> ({{ t('verify.steps.completed') }})</span>
      </PTag>
      <PIcon name="chevron-right" :size="16" aria-hidden="true" />
    </li>
    <li :aria-current="verified ? 'step' : undefined">
      <PTag :color="verified ? 'brand' : 'gray'">{{ t('verify.steps.community') }}</PTag>
    </li>
  </ol>
</template>
