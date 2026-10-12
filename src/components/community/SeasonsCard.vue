<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { EmptyState } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PTag from '@/components/ui/PTag.vue'
import { formatThousands, type SeasonSummary } from '@/lib/community'
import { isFlagEnabled } from '@/router/flags'
import { formatOrdinal } from '@/utils/numbers'
import CommunityCard from './CommunityCard.vue'

export interface SeasonRow extends SeasonSummary {
  season: { id: number; name?: string | null }
}

/**
 * «Temporadas anteriores» card: one row per past season in which the community has points
 * (newest first): champion(s), their points (thousands separator, forced on 4 digits) and your
 * place — «No jugaste» if you have no row that season, a trophy tag if you were champion. Each
 * season links to its ranking. «Ver palmarés» only with the `HONOURS` flag.
 *
 * Props: `rows`, `communityId`, `honoursTo`, `loading`, `error`. Emits `retry`.
 */
defineProps<{
  rows: readonly SeasonRow[]
  communityId: number | string
  /** Route of the honours screen (`/ranking/:c/:s/palmares`); the button needs it and the flag. */
  honoursTo?: string
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
const list = (names: readonly string[]) =>
  new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(names)
const th = 'table-head bg-surface-muted text-muted border-border border-b px-3 py-2.5'
const td = 'border-border text-body border-b px-3 py-2.5 group-last:border-b-0'
</script>

<template>
  <CommunityCard
    :title="t('community.seasons.title')"
    :loading="loading"
    :error="error"
    :what="t('community.error.seasons')"
    :rows="3"
    flush
    @retry="$emit('retry')"
  >
    <div
      v-if="rows.length"
      class="overflow-x-auto"
      tabindex="0"
      role="region"
      :aria-label="t('community.seasons.table')"
    >
      <table class="w-full border-collapse text-sm leading-5">
        <caption class="sr-only">
          {{
            t('community.seasons.table')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" :class="[th, 'text-left']">{{ t('community.seasons.season') }}</th>
            <th scope="col" :class="[th, 'text-left']">{{ t('community.seasons.champion') }}</th>
            <th scope="col" :class="[th, 'text-right']">{{ t('community.seasons.points') }}</th>
            <th scope="col" :class="[th, 'text-left']">{{ t('community.seasons.yourPlace') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.season.id" class="group">
            <th scope="row" :class="[td, 'text-left']">
              <RouterLink
                :to="`/ranking/${communityId}/${r.season.id}`"
                :aria-label="
                  t('community.seasons.ranking', { season: r.season.name ?? r.season.id })
                "
                class="text-heading inline-flex min-h-11 items-center font-semibold md:min-h-8"
                >{{ r.season.name ?? r.season.id }}</RouterLink
              >
            </th>
            <td :class="td">{{ list(r.champions) }}</td>
            <td :class="[td, 'text-right tabular-nums']">{{ formatThousands(r.points) }}</td>
            <td :class="td">
              <span v-if="r.place == null" class="text-muted">{{
                t('community.seasons.didNotPlay')
              }}</span>
              <PTag v-else-if="r.place === 1" color="brand" icon="trophy">{{
                formatOrdinal(1)
              }}</PTag>
              <template v-else>{{ formatOrdinal(r.place) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState
      v-else
      icon="emoji_events"
      :title="t('community.seasons.empty')"
      :text="t('community.seasons.emptyText')"
    />
    <template v-if="honoursTo && isFlagEnabled('HONOURS')" #footer>
      <PButton variant="soft" size="sm" :to="honoursTo" class="mr-auto">{{
        t('community.seasons.honours')
      }}</PButton>
    </template>
  </CommunityCard>
</template>
