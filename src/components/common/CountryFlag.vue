<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { countryCode, type FlagCode } from '@/lib/f1Media/countries'

/**
 * Flag of a country, from the `flag-icons` SVG set (MIT). Only the flags listed in `LOADERS` are
 * bundled, each in its own lazy chunk, so a flag costs a request only when it is shown. Without a
 * known flag, or if its image fails, the component shows the country text (or the ISO code).
 */
const props = defineProps<{
  /** Country as the API or the admin writes it («Singapore», «Países Bajos»), or an ISO code. */
  country: string
}>()
const { t } = useI18n()

/** One loader per bundled flag: the dynamic import keeps each SVG out of the main chunk. */
const LOADERS: Record<FlagCode, () => Promise<{ default: string }>> = {
  at: () => import('flag-icons/flags/4x3/at.svg?url'),
  ae: () => import('flag-icons/flags/4x3/ae.svg?url'),
  au: () => import('flag-icons/flags/4x3/au.svg?url'),
  az: () => import('flag-icons/flags/4x3/az.svg?url'),
  be: () => import('flag-icons/flags/4x3/be.svg?url'),
  bh: () => import('flag-icons/flags/4x3/bh.svg?url'),
  br: () => import('flag-icons/flags/4x3/br.svg?url'),
  ca: () => import('flag-icons/flags/4x3/ca.svg?url'),
  ch: () => import('flag-icons/flags/4x3/ch.svg?url'),
  cn: () => import('flag-icons/flags/4x3/cn.svg?url'),
  de: () => import('flag-icons/flags/4x3/de.svg?url'),
  es: () => import('flag-icons/flags/4x3/es.svg?url'),
  fr: () => import('flag-icons/flags/4x3/fr.svg?url'),
  gb: () => import('flag-icons/flags/4x3/gb.svg?url'),
  hu: () => import('flag-icons/flags/4x3/hu.svg?url'),
  it: () => import('flag-icons/flags/4x3/it.svg?url'),
  jp: () => import('flag-icons/flags/4x3/jp.svg?url'),
  mc: () => import('flag-icons/flags/4x3/mc.svg?url'),
  mx: () => import('flag-icons/flags/4x3/mx.svg?url'),
  nl: () => import('flag-icons/flags/4x3/nl.svg?url'),
  qa: () => import('flag-icons/flags/4x3/qa.svg?url'),
  sa: () => import('flag-icons/flags/4x3/sa.svg?url'),
  sg: () => import('flag-icons/flags/4x3/sg.svg?url'),
  us: () => import('flag-icons/flags/4x3/us.svg?url'),
}

const code = computed(() => countryCode(props.country))
const src = ref<string | null>(null)
const failed = ref(false)
const label = computed(() => t('f1Media.flag.label', { country: props.country }))
const fallback = computed(() => code.value?.toUpperCase() ?? props.country)

let request = 0
watch(
  code,
  async (c) => {
    const current = ++request
    src.value = null
    failed.value = false
    if (!c) return
    try {
      const mod = await LOADERS[c]()
      if (current === request) src.value = mod.default
    } catch {
      if (current === request) failed.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="label"
    width="24"
    height="18"
    class="inline-block h-[18px] w-6 rounded-[2px] object-cover align-middle"
    @error="failed = true"
  />
  <span v-else class="text-muted text-xs font-semibold tabular-nums" :aria-label="label" role="img">
    {{ fallback }}
  </span>
</template>
