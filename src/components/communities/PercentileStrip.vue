<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Strip 0-100 of a community: baseline, shaded upper quartile, one grey dot per other member at
 * their percentile and the user's dot (with the number) on top. Pure SVG (percent coordinates),
 * `role="img"` with the text alternative «Percentil n en {name}».
 *
 * Props: `percentile` (own, 0-100), `others` (percentiles of the other members), `name`.
 */
const props = defineProps<{ percentile: number; others: readonly number[]; name: string }>()
const { t } = useI18n()
const label = computed(() =>
  t('communities.percentile.stripLabel', { n: props.percentile, name: props.name }),
)
</script>

<template>
  <svg
    role="img"
    :aria-label="label"
    class="block h-10 w-full overflow-visible"
    height="40"
    width="100%"
  >
    <rect x="0" y="19" width="100%" height="2" class="fill-surface-muted" />
    <rect x="75%" y="13" width="25%" height="14" rx="4" class="fill-tint" />
    <circle
      v-for="(p, i) in others"
      :key="i"
      :cx="`${p}%`"
      cy="20"
      r="4"
      class="fill-series-rest"
      opacity="0.6"
    />
    <circle
      :cx="`${percentile}%`"
      cy="20"
      r="10"
      stroke-width="2"
      class="fill-series-you stroke-surface"
    />
    <text
      :x="`${percentile}%`"
      y="24"
      text-anchor="middle"
      font-size="11"
      font-weight="700"
      class="fill-white"
    >
      {{ percentile }}
    </text>
  </svg>
</template>
