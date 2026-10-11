<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { gpsApi } from '@/api'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import AppImage from '@/components/ui/AppImage.vue'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { gpPath, sessionPath } from '@/lib/gp'
import { formatClosing } from '@/lib/home'
import { useHome } from './useHome'

/** «Qué tienes que hacer ahora»: next GP (column 1) and the user's predictions (column 2). */
const { t } = useI18n()
const home = useHome()
const next = computed(() => home.next)
const failedImage = ref(false)

const promoSrc = computed(() => {
  const gp = next.value.gp
  if (!gp?.hasPromoImage || failedImage.value) return undefined
  return gpsApi.gpImageUrl(gp.competition?.id ?? 1, gp.season?.id ?? '', gp.id)
})
const detail = computed(() => {
  const gp = next.value.gp
  if (!gp) return ''
  const base = gp.laps
    ? t('home.next.detail', { circuit: next.value.circuit, laps: gp.laps })
    : t('home.next.detailNoLaps', { circuit: next.value.circuit })
  return base + (next.value.sprint ? t('home.next.withSprint') : '')
})
</script>

<template>
  <section
    class="bg-surface ring-card-ring min-w-0 rounded-lg p-5 shadow-(--card-shadow) ring-1"
    :aria-label="t('home.cmd.label')"
  >
    <div v-if="next.isLoading" class="grid gap-5 min-[901px]:grid-cols-[260px_minmax(0,1fr)]">
      <Skeleton variant="card" />
      <div class="flex flex-col gap-3">
        <Skeleton variant="line" />
        <Skeleton v-for="n in 4" :key="n" variant="card" class="[&_.skel-card]:h-14" />
      </div>
    </div>
    <ErrorState
      v-else-if="next.isError"
      :what="t('home.cmd.error')"
      :error="next.error"
      @retry="next.refetch()"
    />
    <EmptyState
      v-else-if="next.none || !next.gp"
      icon="flag"
      :title="t('home.cmd.noNext.title')"
      :text="t('home.cmd.noNext.text')"
    />
    <div v-else class="grid gap-5 min-[901px]:grid-cols-[260px_minmax(0,1fr)]">
      <div class="flex flex-col gap-2">
        <span class="text-muted text-xs font-semibold tracking-[0.05em] uppercase">{{
          t('home.next.label')
        }}</span>
        <h2 class="text-heading m-0 text-[22px] leading-7 font-semibold">
          {{ t('home.next.title', { name: next.shortName }) }}
        </h2>
        <div
          class="from-brand-800 to-brand-900 relative flex h-[150px] items-center justify-center overflow-hidden rounded-lg bg-linear-to-br"
        >
          <AppImage
            v-if="promoSrc"
            :src="promoSrc"
            :alt="t('home.next.image', { name: next.shortName })"
            :width="300"
            :height="150"
            class="absolute inset-0 h-full w-full object-cover"
            @error="failedImage = true"
          />
          <svg v-else viewBox="0 0 400 300" height="110" aria-hidden="true" focusable="false">
            <path
              d="M80 210 L140 130 L210 120 L250 80 L330 90 L350 150 L300 200 L250 190 L210 240 L120 250 Z"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              stroke-linejoin="round"
              class="text-brand-300"
            />
          </svg>
        </div>
        <span class="text-muted text-[13px]">{{ detail }}</span>
        <PButton :to="gpPath(next.gp)" variant="ghost" size="sm" class="-ml-3 self-start">
          {{ t('home.next.weekend') }}
          <PIcon name="arrow-right" :size="16" />
        </PButton>
      </div>

      <div class="flex min-w-0 flex-col gap-3">
        <div class="flex items-baseline justify-between gap-3">
          <h3 class="text-heading m-0 text-base font-semibold">
            {{ t('home.predictions.title') }}
          </h3>
          <span class="text-muted text-[13px]">{{
            t('home.predictions.progress', { done: next.done, total: next.rows.length })
          }}</span>
        </div>
        <ProgressBar
          :value="next.done"
          :max="Math.max(next.rows.length, 1)"
          :label="t('home.predictions.progressLabel')"
        />
        <ErrorState
          v-if="next.rowsError"
          :what="t('home.predictions.error')"
          @retry="next.rowsRefetch()"
        />
        <p v-else-if="!next.rows.length" class="text-muted m-0 text-sm">
          {{ t('home.predictions.noSessions') }}
        </p>
        <ul
          v-else
          class="m-0 flex list-none flex-col gap-2 p-0"
          :aria-label="t('home.predictions.list')"
          :aria-busy="next.rowsLoading"
        >
          <li
            v-for="r in next.rows"
            :key="r.session.id"
            class="ring-border flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-lg px-3.5 py-2.5 ring-1 ring-inset"
            :class="{
              'bg-surface-muted': r.rs.row === 'done',
              'bg-warn-tint ring-warn': r.rs.row === 'urg',
              'bg-surface': r.rs.row === '',
            }"
          >
            <div class="w-[52px] flex-none text-center" aria-hidden="true">
              <div class="text-muted text-[11px] leading-4 font-semibold uppercase">
                {{ r.day.weekday }}
              </div>
              <div class="text-heading text-[22px] leading-[26px] font-bold tabular-nums">
                {{ r.day.day }}
              </div>
            </div>
            <div class="min-w-[140px] flex-1">
              <b class="text-heading block font-semibold">{{ r.name }}</b>
              <span class="text-muted text-[13px]">
                {{ t('home.predictions.yourTime', { time: r.day.time }) }} ·
                <template v-if="r.rs.kind === 'scored'">{{
                  t('home.predictions.finished')
                }}</template>
                <template v-else-if="r.rs.kind === 'closed'">{{
                  t('home.predictions.closedWaiting')
                }}</template>
                <template v-else>
                  {{ t('home.predictions.closesIn') }}
                  <b
                    class="font-semibold tabular-nums"
                    :class="r.rs.kind === 'urgent' ? 'text-warn-fg' : 'text-heading'"
                    >{{ formatClosing(r.session, home.now) }}</b
                  >
                </template>
              </span>
            </div>
            <PTag :color="r.rs.tag.color">{{ r.rs.tag.text }}</PTag>
            <PButton
              :to="sessionPath(next.gp, r.rs.button.action, r.session)"
              :variant="r.rs.button.variant"
              size="sm"
              class="min-w-[116px]"
              :aria-label="t('home.row.aria', { action: r.rs.button.label, session: r.name })"
            >
              {{ r.rs.button.label }}
            </PButton>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
