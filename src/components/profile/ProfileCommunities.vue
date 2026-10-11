<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { focusRing } from '@/components/ui/styles'
import { useFlag } from '@/flags'
import { percentile } from '@/lib/communities'
import { stripDots } from '@/lib/profile'
import { useProfile } from './useProfile'

/**
 * «Tus comunidades»: place in each one and, behind COMMUNITY_PERCENTILE, the percentile strip.
 * A failing community only affects its own row.
 */
const { t } = useI18n()
const profile = useProfile()
const withPercentile = useFlag('COMMUNITY_PERCENTILE')
const list = computed(() => profile.communities)
const items = computed(() => profile.communityRows.items)
const failure = computed(() => (list.value.isError ? list.value.error : undefined))

interface Row {
  id: number
  name: string
  state: 'loading' | 'error' | 'ready'
  position?: number
  members?: number
  pct?: number
  dots: number[]
}
const rows = computed<Row[]>(() =>
  items.value.map((it) => {
    if (it.state.status === 'ready') {
      const { position, members } = it.state.standing
      const pct = percentile(position, members)
      return {
        id: it.community.id,
        name: it.community.name,
        state: 'ready',
        position,
        members,
        pct,
        dots: stripDots(members, pct),
      }
    }
    const state = it.state.status === 'loading' ? 'loading' : 'error'
    return { id: it.community.id, name: it.community.name, state, dots: [] }
  }),
)
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex min-w-0 flex-col gap-3 rounded-lg p-5 shadow-(--card-shadow) ring-1"
    aria-labelledby="profile-communities-title"
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="profile-communities-title" class="text-heading m-0 text-base font-semibold">
        {{ t('profile.communities.title') }}
      </h2>
      <RouterLink to="/comunidades" class="text-link text-sm font-medium" :class="focusRing">
        {{ t('profile.communities.all') }}
      </RouterLink>
    </header>

    <Skeleton v-if="list.isLoading" variant="line" :lines="3" />
    <ErrorState
      v-else-if="failure"
      :what="t('profile.communities.error')"
      :error="failure"
      @retry="list.refetch()"
    />
    <EmptyState v-else-if="!rows.length" icon="groups" :title="t('profile.communities.empty')" />
    <template v-else>
      <ul class="m-0 flex list-none flex-col p-0">
        <li
          v-for="r in rows"
          :key="r.id"
          class="border-border grid items-center gap-3 border-b py-2 last:border-b-0"
          :class="withPercentile ? 'grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]' : 'grid-cols-1'"
        >
          <div class="min-w-0">
            <RouterLink
              :to="`/comunidades/${r.id}`"
              class="text-heading font-semibold break-words"
              :class="focusRing"
            >
              {{ r.name }}
            </RouterLink>
            <p class="text-muted m-0 text-xs">
              <template v-if="r.state === 'ready'">
                {{ t('profile.communities.position', { pos: r.position, n: r.members }) }}
              </template>
              <template v-else-if="r.state === 'error'">
                {{ t('profile.communities.rowError') }}
              </template>
              <template v-else>{{ t('profile.communities.loading') }}</template>
            </p>
          </div>
          <template v-if="withPercentile">
            <div
              v-if="r.state === 'ready'"
              role="img"
              :aria-label="t('profile.communities.strip', { pct: r.pct })"
              class="relative h-7"
            >
              <span class="bg-surface-muted absolute inset-x-0 top-[13px] h-0.5" />
              <span
                v-for="(d, i) in r.dots"
                :key="i"
                class="bg-series-rest absolute top-[10px] size-2 -translate-x-1/2 rounded-full opacity-60"
                :style="{ left: `${d}%` }"
              />
              <span
                class="bg-series-you ring-surface absolute top-[5px] size-[18px] -translate-x-1/2 rounded-full ring-2"
                :style="{ left: `${r.pct}%` }"
              />
            </div>
            <span v-else />
            <b v-if="r.state === 'ready'" class="text-heading w-10 text-right tabular-nums">{{
              r.pct
            }}</b>
            <span v-else />
          </template>
        </li>
      </ul>
      <p v-if="withPercentile" class="text-muted m-0 text-xs">
        {{ t('profile.communities.note') }}
      </p>
    </template>
  </section>
</template>
