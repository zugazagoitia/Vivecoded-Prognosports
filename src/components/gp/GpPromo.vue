<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { gpsApi } from '@/api'
import type { GrandPrix } from '@/api/schemas'
import AppImage from '@/components/ui/AppImage.vue'
import { gpShortName } from '@/lib/gp'

/** Promotional image of the GP (6.12) or, without one, a brand gradient with a track outline. */
const props = defineProps<{ gp: GrandPrix }>()
const { t } = useI18n()
const failed = ref(false)

const src = () =>
  props.gp.hasPromoImage && !failed.value
    ? gpsApi.gpImageUrl(props.gp.competition?.id ?? 1, props.gp.season?.id ?? '', props.gp.id)
    : undefined
</script>

<template>
  <div
    class="from-brand-800 to-brand-900 relative flex min-h-[180px] items-center justify-center overflow-hidden bg-linear-to-br"
  >
    <AppImage
      v-if="src()"
      :src="src()!"
      :alt="t('gp.promo.alt', { name: gpShortName(gp) })"
      :width="300"
      :height="200"
      eager
      class="absolute inset-0 h-full w-full object-cover"
      @error="failed = true"
    />
    <template v-else>
      <svg viewBox="0 0 400 300" height="130" aria-hidden="true" focusable="false">
        <path
          d="M80 210 L140 130 L210 120 L250 80 L330 90 L350 150 L300 200 L250 190 L210 240 L120 250 Z"
          fill="none"
          stroke="currentColor"
          stroke-width="8"
          stroke-linejoin="round"
          class="text-brand-300"
        />
      </svg>
      <span
        class="text-brand-200 absolute bottom-3 left-3.5 text-[11px] font-semibold tracking-[0.05em] uppercase"
        >{{ t('gp.promo.placeholder') }}</span
      >
    </template>
  </div>
</template>
