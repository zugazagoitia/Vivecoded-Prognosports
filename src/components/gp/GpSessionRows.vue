<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { GrandPrix } from '@/api/schemas'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { focusRing } from '@/components/ui/styles'
import type { IconName } from '@/components/ui/icons'
import { sessionPath, type StatusKind } from '@/lib/gp'
import type { SessionVm } from './types'

/** Mobile list of sessions with the progress of the user's predictions and a CTA per row. */
const props = defineProps<{
  gp: GrandPrix
  sessions: SessionVm[]
  selectedId?: number
  done: number
}>()
defineEmits<{ select: [id: number] }>()
const { t } = useI18n()

const ICON: Record<StatusKind, { name: IconName; box: string }> = {
  scored: { name: 'circle-check', box: 'bg-ok-tint text-ok-fg' },
  scoredNoPrediction: { name: 'circle-check', box: 'bg-surface-muted text-muted' },
  closed: { name: 'clock', box: 'bg-surface-muted text-muted' },
  closing: { name: 'calendar-check', box: 'bg-warn-tint text-warn-fg' },
  done: { name: 'check', box: 'bg-ok-tint text-ok-fg' },
  open: { name: 'clock', box: 'bg-surface-muted text-muted' },
}

function cta(s: SessionVm) {
  if (s.state !== 'open')
    return { action: 'resultados' as const, label: t('gp.mobile.result'), primary: false }
  if (s.hasPrediction)
    return { action: 'pronosticar' as const, label: t('gp.mobile.edit'), primary: false }
  return {
    action: 'pronosticar' as const,
    label: t('gp.mobile.predict'),
    primary: s.status.kind === 'closing' || s.session.id === props.selectedId,
  }
}
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex flex-col gap-2 rounded-lg p-4 shadow-(--card-shadow) ring-1"
  >
    <div class="flex items-baseline justify-between text-sm">
      <span id="gp-progress" class="text-muted">{{ t('gp.mobile.progress') }}</span>
      <b class="text-heading font-semibold">{{
        t('gp.mobile.progressValue', { done, total: sessions.length })
      }}</b>
    </div>
    <ProgressBar
      :value="done"
      :max="Math.max(sessions.length, 1)"
      :label="t('gp.mobile.progress')"
    />
  </section>
  <section
    :aria-label="t('gp.sessions.list')"
    class="bg-surface ring-card-ring overflow-hidden rounded-lg shadow-(--card-shadow) ring-1"
  >
    <ul class="m-0 list-none p-0">
      <li
        v-for="s in sessions"
        :key="s.session.id"
        class="border-border flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
        :class="s.session.id === selectedId ? 'bg-tint' : ''"
      >
        <button
          type="button"
          :aria-pressed="s.session.id === selectedId"
          :aria-label="t('gp.sessions.select', { session: s.name })"
          :class="[
            'flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left',
            focusRing,
          ]"
          @click="$emit('select', s.session.id)"
        >
          <span
            :class="[
              'flex size-10 flex-none items-center justify-center rounded-[10px]',
              ICON[s.status.kind].box,
            ]"
          >
            <PIcon :name="ICON[s.status.kind].name" :size="20" />
          </span>
          <span class="flex min-w-0 flex-col items-start gap-0.5">
            <b class="text-heading font-semibold">{{ s.name }}</b>
            <span class="text-muted text-xs">{{ s.when }}</span>
            <PTag :color="s.status.color">{{ s.statusText }}</PTag>
          </span>
        </button>
        <PButton
          :to="sessionPath(gp, cta(s).action, s.session)"
          :variant="cta(s).primary ? 'primary' : 'outline'"
          size="sm"
        >
          {{ cta(s).label }}
        </PButton>
      </li>
    </ul>
  </section>
</template>
