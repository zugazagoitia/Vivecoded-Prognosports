<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFlag } from '@/flags'
import type { F1MediaSeason } from '@/lib/f1Media/seasonAssets'
import { badgeColor, badgeTextColor, teamAbbreviation } from '@/lib/f1Media/teamBadge'
import { teamLogoUrl } from '@/lib/f1Media/teamLogos'

/**
 * Team marker (issue 223). Default: own badge (OpenF1 team colour + abbreviation).
 * With VITE_FF_F1_TEAM_LOGOS on: F1 logo, falling back to the own badge if the image fails.
 * Load it through `./lazy` so its styles and code stay out of the eager bundle.
 */
const props = withDefaults(
  defineProps<{
    /** Team name as shown in the app; drives the abbreviation and the logo path. */
    name: string
    /** Team colour from OpenF1 (`teamcolor`), bare hex or `#hex`. */
    teamcolor?: string | null
    season?: F1MediaSeason
    /** Rendered size in CSS pixels (square). */
    size?: number
  }>(),
  { teamcolor: null, season: 2026, size: 32 },
)

const logosOn = useFlag('F1_TEAM_LOGOS')
const failed = ref(false)
watch(
  () => [props.name, props.season],
  () => (failed.value = false),
)

const logoSrc = computed(() =>
  logosOn.value && !failed.value ? teamLogoUrl(props.name, props.season, props.size * 2) : null,
)
const background = computed(() => badgeColor(props.teamcolor))
const abbreviation = computed(() => teamAbbreviation(props.name))
const foreground = computed(() => badgeTextColor(background.value))
</script>

<template>
  <img
    v-if="logoSrc"
    class="team-badge team-badge--logo"
    :src="logoSrc"
    :alt="name"
    :width="size"
    :height="size"
    :style="{ width: `${size}px`, height: `${size}px` }"
    loading="lazy"
    decoding="async"
    @error="failed = true"
  />
  <span
    v-else
    class="team-badge"
    role="img"
    :aria-label="name"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.round(size * 0.34)}px`,
      background,
      color: foreground,
    }"
    >{{ abbreviation }}</span
  >
</template>

<style scoped>
.team-badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.2);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
}

.team-badge--logo {
  box-shadow: none;
  object-fit: contain;
  background: transparent;
}
</style>
