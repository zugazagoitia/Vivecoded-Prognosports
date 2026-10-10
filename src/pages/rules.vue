<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import HitCell from '@/components/data/HitCell.vue'
import type { HitKind } from '@/components/data/types'
import { CLASSIC_RULESET, SESSIONS, type SessionId } from '@/components/rules/classicRuleset'
import RulesExample from '@/components/rules/RulesExample.vue'
import { formatSessionInfo, type RuleKey } from '@/components/rules/rules'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PTitle from '@/components/ui/PTitle.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { focusRing } from '@/components/ui/styles'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: {
    layout: 'landing',
    title: 'route.rules',
  },
})

const { t } = useI18n()
const session = useSessionStore()
const rules = CLASSIC_RULESET.data

const crumbs = computed(() => [
  { label: t('rules.home'), to: session.isAuthenticated ? '/home' : '/' },
  { label: t('rules.title') },
])
const ctaTo = computed(() => (session.isAuthenticated ? '/home' : '/registro'))

// Table of contents with the visible section marked.
const SECTIONS = ['sesiones', 'puntos', 'ejemplo', 'bonus', 'extras'] as const
const tocKeys = ['sessions', 'points', 'example', 'bonus', 'extras'] as const
const current = ref<string>('sesiones')
const sectionEls = ref<HTMLElement[]>([])
onMounted(() => {
  sectionEls.value = SECTIONS.map((id) => document.getElementById(id)).filter(
    (el): el is HTMLElement => el !== null,
  )
})
useIntersectionObserver(
  sectionEls,
  (entries) => {
    const hit = entries.find((e) => e.isIntersecting)
    if (hit) current.value = hit.target.id
  },
  { rootMargin: '-72px 0px -60% 0px' },
)

// Sessions.
const sessionId = ref<SessionId>('q')
const sessionOptions = computed(() =>
  SESSIONS.map((s) => ({ value: s.id, label: t(`rules.sessions.names.${s.id}`) })),
)
const info = computed(() => {
  const s = SESSIONS.find((x) => x.id === sessionId.value) ?? SESSIONS[0]!
  const f = formatSessionInfo(
    { predictedPositions: s.predictedPositions, closes: t(`rules.sessions.close.${s.closes}`) },
    t,
  )
  return { ...f, available: t(`rules.sessions.available.${s.available}`) }
})

// Points table.
const concepts: { key: RuleKey | 'topScorer'; kind: HitKind; points: number }[] = [
  { key: 'exact', kind: 'exact', points: rules.pointsByEqualsPosition },
  { key: 'next', kind: 'near', points: rules.pointsByNextPosition },
  { key: 'previous', kind: 'near', points: rules.pointsByPreviousPosition },
  { key: 'nextOfFollowing', kind: 'far', points: rules.pointsByNextOfFollowingPosition },
  { key: 'previousOfPrevious', kind: 'far', points: rules.pointsByPreviousOfPreviousPosition },
  { key: 'podium', kind: 'miss', points: rules.pointsIfIsNotInPodium },
  { key: 'notInResults', kind: 'miss', points: rules.pointsIfIsNotInResults },
  { key: 'topScorer', kind: 'exact', points: rules.pointsByTopScorer },
]
const extras = [
  { icon: 'stopwatch', key: 'fastest' },
  { icon: 'calendar-check', key: 'changes' },
  { icon: 'eye', key: 'visibility' },
  { icon: 'sliders', key: 'community' },
  { icon: 'ban', key: 'money' },
] as const
</script>

<template>
  <div class="pg-main lg flex flex-col gap-8">
    <header class="flex flex-col gap-2">
      <Breadcrumb :items="crumbs" />
      <PTitle>{{ t('rules.title') }}</PTitle>
      <p class="t-body text-muted max-w-[720px]">
        {{ t('rules.intro', { name: CLASSIC_RULESET.displayname }) }}
      </p>
    </header>

    <div class="grid gap-6 min-[901px]:grid-cols-[200px_minmax(0,1fr)] min-[901px]:items-start">
      <nav
        :aria-label="t('rules.toc.label')"
        class="flex gap-1 overflow-x-auto min-[901px]:sticky min-[901px]:top-[72px] min-[901px]:flex-col min-[901px]:gap-0.5 min-[901px]:overflow-visible"
      >
        <span class="t-up text-muted hidden px-2.5 py-1.5 min-[901px]:block">{{
          t('rules.toc.label')
        }}</span>
        <RouterLink
          v-for="(id, i) in SECTIONS"
          :key="id"
          :to="{ hash: `#${id}` }"
          :aria-current="current === id ? 'true' : undefined"
          :class="[
            'text-muted hover:bg-surface-muted hover:text-heading aria-[current=true]:text-heading aria-[current=true]:bg-surface-muted inline-flex min-h-11 items-center rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap no-underline',
            focusRing,
          ]"
          >{{ t(`rules.toc.${tocKeys[i]}`) }}</RouterLink
        >
      </nav>

      <div class="flex min-w-0 flex-col gap-8">
        <!-- Sessions -->
        <PCard id="sesiones" class="scroll-mt-20">
          <div class="flex flex-col gap-4">
            <div>
              <PTitle level="subtitle" as="h2">{{ t('rules.sessions.title') }}</PTitle>
              <i18n-t keypath="rules.sessions.text" tag="p" class="text-body mt-2">
                <template #bold
                  ><b class="text-heading">{{ t('rules.sessions.bold') }}</b></template
                >
              </i18n-t>
            </div>
            <div class="flex flex-wrap">
              <SegmentedControl
                v-model="sessionId"
                :options="sessionOptions"
                :label="t('rules.sessions.pick')"
                class="flex-wrap"
              />
            </div>
            <div class="bg-surface-muted ring-border flex flex-wrap gap-4 rounded-lg p-4 ring-1">
              <div class="flex flex-col">
                <span class="t-up text-muted">{{ t('rules.sessions.driversLabel') }}</span>
                <b class="text-heading text-[28px] leading-9 tabular-nums">{{ info.drivers }}</b>
              </div>
              <div class="bg-border w-px self-stretch max-sm:hidden" aria-hidden="true" />
              <div class="flex min-w-[200px] flex-1 flex-col gap-0.5">
                <span class="t-up text-muted">{{ t('rules.sessions.closesLabel') }}</span>
                <b class="text-heading">{{ info.closes }}</b>
              </div>
              <div class="bg-border w-px self-stretch max-sm:hidden" aria-hidden="true" />
              <div class="flex min-w-[200px] flex-1 flex-col gap-0.5">
                <span class="t-up text-muted">{{ t('rules.sessions.availableLabel') }}</span>
                <b class="text-heading">{{ info.available }}</b>
              </div>
            </div>
          </div>
        </PCard>

        <!-- Points -->
        <PCard id="puntos" class="scroll-mt-20" :padded="false">
          <div class="p-3 sm:p-5">
            <PTitle level="subtitle" as="h2">{{ t('rules.points.title') }}</PTitle>
            <p class="text-body mt-2">{{ t('rules.points.text') }}</p>
          </div>
          <div class="tw">
            <table class="tn w-full border-collapse text-sm">
              <caption class="sr-only">
                {{
                  t('rules.points.caption', { name: CLASSIC_RULESET.displayname })
                }}
              </caption>
              <thead>
                <tr class="border-border text-muted border-y text-left">
                  <th scope="col" class="t-up px-4 py-2">{{ t('rules.points.concept') }}</th>
                  <th scope="col" class="t-up px-4 py-2">{{ t('rules.points.example') }}</th>
                  <th scope="col" class="t-up px-4 py-2 text-right">
                    {{ t('rules.points.points') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in concepts"
                  :key="c.key"
                  class="border-border border-b last:border-b-0"
                >
                  <td class="px-4 py-2">
                    <span class="flex items-center gap-2">
                      <HitCell :kind="c.kind" :points="c.points" :label="String(c.points)" />
                      <b class="text-heading">{{ t(`rules.points.concepts.${c.key}`) }}</b>
                    </span>
                  </td>
                  <td class="text-muted px-4 py-2">{{ t(`rules.points.examples.${c.key}`) }}</td>
                  <td class="text-heading px-4 py-2 text-right font-bold">{{ c.points }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </PCard>

        <!-- Example -->
        <PCard id="ejemplo" class="scroll-mt-20" :padded="false">
          <div class="p-3 sm:p-5">
            <PTitle level="subtitle" as="h2">{{ t('rules.example.title') }}</PTitle>
            <p class="text-body mt-2 mb-3">{{ t('rules.example.text') }}</p>
            <RulesExample :rules="rules" />
          </div>
        </PCard>

        <!-- Bonus -->
        <PCard id="bonus" class="scroll-mt-20">
          <div class="flex flex-col gap-3">
            <div>
              <PTitle level="subtitle" as="h2">{{ t('rules.bonus.title') }}</PTitle>
              <p class="text-body mt-2">{{ t('rules.bonus.text') }}</p>
            </div>
            <PrognoAlert
              variant="brand"
              :title="t('rules.bonus.alertTitle', { n: rules.pointsByTopScorer })"
              >{{ t('rules.bonus.alert') }}</PrognoAlert
            >
          </div>
        </PCard>

        <!-- Details -->
        <PCard id="extras" class="scroll-mt-20">
          <div class="flex flex-col gap-3">
            <PTitle level="subtitle" as="h2">{{ t('rules.extras.title') }}</PTitle>
            <div v-for="e in extras" :key="e.key" class="flex items-start gap-3">
              <PIcon :name="e.icon" :size="20" class="text-ring mt-0.5 shrink-0" />
              <i18n-t
                v-if="e.key === 'fastest' || e.key === 'visibility'"
                :keypath="`rules.extras.${e.key}`"
                tag="p"
                class="text-body m-0"
              >
                <template #bold
                  ><b class="text-heading">{{ t(`rules.extras.${e.key}Bold`) }}</b></template
                >
              </i18n-t>
              <p v-else class="text-body m-0">{{ t(`rules.extras.${e.key}`) }}</p>
            </div>
            <div>
              <PButton :to="ctaTo">{{ t('rules.extras.cta') }}</PButton>
            </div>
          </div>
        </PCard>
      </div>
    </div>
  </div>
</template>
