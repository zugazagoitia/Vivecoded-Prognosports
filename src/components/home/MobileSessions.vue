<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ErrorState, Skeleton } from '@/components/states'
import PIcon from '@/components/ui/PIcon.vue'
import { focusRing } from '@/components/ui/styles'
import { sessionPath } from '@/lib/gp'
import { formatClosing } from '@/lib/home'
import { formatNumber } from '@/utils/numbers'
import type { HomeRow } from '@/queries/home'
import { useHome } from './useHome'

/** Phone: «Tus pronósticos» as a list of link rows (56 px) with the four literal variants. */
const { t } = useI18n()
const home = useHome()
const next = computed(() => home.next)

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function when(r: HomeRow): string {
  return `${cap(r.day.weekday)} ${r.day.day}`
}
function caption(r: HomeRow): string {
  switch (r.rs.kind) {
    case 'scored':
      return r.hasPrediction && r.points != null
        ? t('home.mobile.sessionLine', {
            when: when(r),
            text: t('home.mobile.terminatedPts', { n: formatNumber(r.points, 1) }),
          })
        : t('home.mobile.sessionLine', { when: when(r), text: t('home.mobile.terminated') })
    case 'closed':
      return t('home.mobile.sessionLine', { when: when(r), text: t('home.row.closed') })
    case 'made':
      return `${when(r)} · ${r.day.time} · ${t('home.mobile.made')}`
    default:
      return `${when(r)} · ${r.day.time} · ${t('home.mobile.closesIn', { time: formatClosing(r.session, home.now) })}`
  }
}
const action = (r: HomeRow) =>
  r.rs.kind === 'scored' || r.rs.kind === 'closed' ? t('home.mobile.view') : r.rs.button.label

const BADGE: Record<string, string> = {
  scored: 'bg-ok-tint text-ok-fg',
  closed: 'bg-surface-muted text-muted',
  made: 'bg-ok-tint text-ok-fg',
  urgent: 'bg-warn text-black',
  pending: 'bg-tint text-tint-fg',
}
const ACTION: Record<string, string> = {
  scored: 'text-muted',
  closed: 'text-muted',
  made: 'text-muted',
  urgent: 'text-warn-fg',
  pending: 'text-tint-fg',
}
</script>

<template>
  <section
    v-if="next.gp || next.isLoading"
    class="bg-surface ring-card-ring flex flex-col gap-1 rounded-lg p-4 shadow-(--card-shadow) ring-1"
    aria-labelledby="home-preds-m"
  >
    <div class="flex items-baseline justify-between">
      <h2 id="home-preds-m" class="text-heading m-0 text-base font-semibold">
        {{ t('home.predictions.title') }}
      </h2>
      <span class="text-muted text-sm">{{
        t('home.mobile.progress', { done: next.done, total: next.rows.length })
      }}</span>
    </div>
    <Skeleton v-if="next.isLoading" variant="card" />
    <ErrorState
      v-else-if="next.rowsError"
      :what="t('home.predictions.error')"
      @retry="next.rowsRefetch()"
    />
    <ul v-else class="m-0 flex list-none flex-col gap-2 p-0 pt-2">
      <li v-for="(r, i) in next.rows" :key="r.session.id">
        <RouterLink
          :to="sessionPath(next.gp!, r.rs.button.action, r.session)"
          class="ring-border flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 no-underline ring-1 ring-inset"
          :class="[r.rs.row === 'urg' ? 'bg-warn-tint ring-warn' : 'bg-surface', focusRing]"
          :aria-label="`${action(r)}: ${r.name}. ${caption(r)}`"
        >
          <span
            class="flex size-7 flex-none items-center justify-center rounded-full text-sm font-bold"
            :class="BADGE[r.rs.kind]"
            aria-hidden="true"
          >
            <PIcon v-if="['scored', 'made'].includes(r.rs.kind)" name="check" :size="16" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <b class="text-heading text-sm font-semibold">{{ r.name }}</b>
            <span class="text-muted text-xs">{{ caption(r) }}</span>
          </span>
          <span class="flex-none text-sm font-semibold" :class="ACTION[r.rs.kind]">{{
            action(r)
          }}</span>
          <PIcon name="chevron-right" :size="16" class="text-muted" />
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
