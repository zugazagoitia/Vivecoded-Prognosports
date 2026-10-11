<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'

/**
 * Before the session closes the other players' predictions are private (6.8): nothing of them
 * is requested or shown. `text` says when they become visible.
 */
defineProps<{ text: string; predictTo: string; hasPrediction: boolean }>()
const { t } = useI18n()
</script>

<template>
  <PCard>
    <div class="flex flex-col items-center gap-2 px-4 py-10 text-center" data-locked>
      <span
        class="bg-tint text-tint-fg flex h-14 w-14 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <PIcon name="lock" :size="24" />
      </span>
      <h2 class="t-header text-heading m-0">{{ t('consensus.locked.title') }}</h2>
      <p class="text-muted m-0 max-w-md text-sm">{{ text }}</p>
      <PButton :to="predictTo" size="sm" class="mt-2">{{
        hasPrediction ? t('consensus.locked.edit') : t('consensus.locked.predict')
      }}</PButton>
    </div>
  </PCard>
</template>
