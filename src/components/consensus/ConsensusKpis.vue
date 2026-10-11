<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OriginalBet, Vote } from '@/lib/consensus'

/** The three curiosities: most voted for 1.º, most original bet and agreement with the majority. */
const props = defineProps<{
  top?: Vote
  original?: OriginalBet
  /** Rounded %, undefined when the user did not predict the session. */
  agree?: number
  players: number
}>()
const { t } = useI18n()

const originalDetail = computed(() => {
  const o = props.original
  if (!o) return ''
  const names = o.voters.join(', ')
  if (o.votes === 1) {
    return names ? t('consensus.kpi.originalOne', { names }) : t('consensus.kpi.originalAnon')
  }
  return names
})
const dd = 'text-muted m-0 text-[13px]'
const card =
  'bg-surface ring-card-ring flex min-w-0 flex-col gap-0.5 rounded-lg px-5 py-4 shadow-(--card-shadow) ring-1'
const label = 'text-muted text-xs leading-4 font-semibold tracking-wide uppercase'
const value = 'text-heading m-0 text-[28px] leading-9 font-bold tabular-nums'
</script>

<template>
  <section class="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
    <dl :class="card" data-kpi="top">
      <dt :class="label">{{ t('consensus.kpi.top') }}</dt>
      <dd :class="value">{{ top?.code ?? t('consensus.kpi.none') }}</dd>
      <dd v-if="top" :class="dd">
        {{ t('consensus.kpi.topDetail', { n: top.votes, total: players }, players) }}
      </dd>
    </dl>
    <dl :class="card" data-kpi="original">
      <dt :class="label">{{ t('consensus.kpi.original') }}</dt>
      <dd :class="value">
        {{
          original
            ? t('consensus.kpi.originalValue', { code: original.code })
            : t('consensus.kpi.none')
        }}
      </dd>
      <dd v-if="original && originalDetail" :class="dd">{{ originalDetail }}</dd>
    </dl>
    <dl :class="card" data-kpi="agree">
      <dt :class="label">{{ t('consensus.kpi.agree') }}</dt>
      <dd :class="value">
        {{ agree != null ? t('consensus.kpi.agreeValue', { n: agree }) : t('consensus.kpi.none') }}
      </dd>
      <dd :class="dd">
        {{ agree != null ? t('consensus.kpi.agreeDetail') : t('consensus.kpi.agreeNone') }}
      </dd>
    </dl>
  </section>
</template>
