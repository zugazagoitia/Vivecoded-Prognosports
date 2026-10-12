<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FormEntry } from '@/lib/community'
import { formKind } from '@/lib/community'
import { formatOrdinal } from '@/utils/numbers'

/**
 * Form of a player: the place in each of the last 5 GPs (oldest first). 1st = brand colour,
 * 2nd/3rd = tint, others neutral — and never only colour: every chip carries visually-hidden
 * text «{GP}: {n}.º», which is also the accessible table alternative for screen readers.
 * No `title` attribute (mockup bug) and no tab stops: 12 rows x 5 chips would trap the keyboard.
 *
 * Props: `entries` (`FormEntry[]` from `buildStandings`).
 */
defineProps<{ entries: readonly FormEntry[] }>()
const { t } = useI18n()
</script>

<template>
  <ul v-if="entries.length" class="m-0 flex list-none gap-1 p-0">
    <li
      v-for="e in entries"
      :key="e.gpId"
      :data-kind="formKind(e.place)"
      class="inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums"
      :class="{
        'bg-primary text-on-primary': formKind(e.place) === 'won',
        'bg-tint text-tint-fg': formKind(e.place) === 'podium',
        'bg-surface-muted text-body': formKind(e.place) === 'rest',
      }"
    >
      <span aria-hidden="true">{{ e.place }}</span>
      <span class="sr-only">{{
        t('community.members.formItem', { gp: e.gpName, place: formatOrdinal(e.place) })
      }}</span>
    </li>
  </ul>
  <span v-else class="text-muted"
    >—<span class="sr-only">{{ t('community.members.formNone') }}</span></span
  >
</template>
