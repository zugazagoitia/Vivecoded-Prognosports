<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { countdownParts, two } from '@/lib/home'
import { useHome } from './useHome'

/** Phone: next GP with the countdown to the next closing (gradient block `.ngp`). */
const { t } = useI18n()
const home = useHome()
const next = computed(() => home.next)

const target = computed(() => next.value.nextSession)
const parts = computed(() => (target.value ? countdownParts(target.value.session, home.now) : null))
const kicker = computed(() => {
  const gp = next.value.gp
  const base = gp?.round
    ? t('home.mobile.kicker', { round: gp.round })
    : t('home.mobile.kickerNoRound')
  return base + (next.value.sprint ? t('home.mobile.sprint') : '')
})
const timerLabel = computed(() => {
  if (!parts.value || !target.value) return ''
  const { d, h, m } = parts.value
  return t(h === 1 ? 'home.mobile.timerOne' : 'home.mobile.timer', {
    d,
    h,
    m,
    session: target.value.article.replace(/^(el|la) /, ''),
  })
})
</script>

<template>
  <Skeleton v-if="next.isLoading" variant="card" />
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
  <section
    v-else
    class="from-brand-800 to-brand-900 flex flex-col gap-3 rounded-xl bg-linear-to-br p-4 text-white"
    :aria-label="t('home.mobile.nextLabel')"
  >
    <span class="text-brand-200 text-xs font-semibold tracking-[0.05em] uppercase">{{
      kicker
    }}</span>
    <h2 class="m-0 text-[22px] leading-7 font-semibold text-white">
      {{ t('home.next.title', { name: next.shortName }) }}
    </h2>
    <template v-if="parts && target">
      <div role="timer" class="grid grid-cols-3 gap-2" :aria-label="timerLabel">
        <div
          v-for="c in [
            { v: parts.d, u: t('home.mobile.days') },
            { v: parts.h, u: t('home.mobile.hours') },
            { v: parts.m, u: t('home.mobile.min') },
          ]"
          :key="c.u"
          class="flex flex-col items-center rounded-lg bg-white/10 py-2"
          aria-hidden="true"
        >
          <b class="text-2xl leading-[30px] font-bold text-white tabular-nums">{{ two(c.v) }}</b>
          <span class="text-brand-200 text-[11px]">{{ c.u }}</span>
        </div>
      </div>
      <span class="text-brand-100 text-[13px]">{{
        t('home.mobile.forClose', { session: target.article.replace(/^(el|la) /, '') })
      }}</span>
    </template>
  </section>
</template>
