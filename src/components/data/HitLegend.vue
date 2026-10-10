<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import HitCell from './HitCell.vue'

const { t } = useI18n()
</script>

<template>
  <p class="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
    <span class="sr-only">{{ t('data.hit.legend.label') }}:</span>
    <span class="inline-flex items-center gap-1">
      <HitCell kind="exact" label="5" aria-hidden="true" />{{ t('data.hit.legend.exact') }},
    </span>
    <span class="inline-flex items-center gap-1">
      <HitCell kind="near" label="3" aria-hidden="true" />{{ t('data.hit.legend.near') }},
    </span>
    <span class="inline-flex items-center gap-1">
      <HitCell kind="far" label="1" aria-hidden="true" />{{ t('data.hit.legend.far') }},
    </span>
    <span class="inline-flex items-center gap-1">
      <HitCell kind="miss" label="0" aria-hidden="true" />{{ t('data.hit.legend.miss') }}
    </span>
  </p>
</template>
