<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState } from '@/components/states'
import Avatar from '@/components/ui/Avatar.vue'
import PButton from '@/components/ui/PButton.vue'
import PInput from '@/components/ui/PInput.vue'
import PTag from '@/components/ui/PTag.vue'
import { filterSortMembers, type StandingRow } from '@/lib/community'
import { formatPoints } from '@/lib/gp'
import { formatOrdinal } from '@/utils/numbers'
import CommunityCard from './CommunityCard.vue'
import FormStrip from './FormStrip.vue'
import RankMove from './RankMove.vue'

/**
 * «Miembros» card: standings table (place with movement, player linking to their profile, form
 * of the last 5 GPs, role, points), name search and order toggle. The signed-in user's row is
 * highlighted (`aria-current`). Search and order are local state; the place shown is always the
 * real one. The table scrolls horizontally inside its own wrapper on phones.
 *
 * Props: `rows` (`StandingRow[]` from `useCommunityStandings`), `loading`, `error`. Emits `retry`.
 * The column «GP en curso» (who has predicted) is not shown: that data is private (see README).
 */
const props = defineProps<{ rows?: readonly StandingRow[]; loading?: boolean; error?: unknown }>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()

const query = ref('')
/** false = «Descendente» (1st on top), true = «Ascendente» (reversed). */
const ascending = ref(false)
const shown = computed(() => filterSortMembers(props.rows ?? [], query.value, ascending.value))
const dir = computed(() => t(ascending.value ? 'community.members.asc' : 'community.members.desc'))
const th =
  'table-head bg-surface-muted text-muted border-border border-b px-3 py-2.5 whitespace-nowrap'
const td = 'border-border text-body border-b px-3 py-2.5 whitespace-nowrap group-last:border-b-0'
</script>

<template>
  <CommunityCard
    :title="t('community.members.title')"
    :loading="loading"
    :error="error"
    :what="t('community.error.members')"
    :rows="12"
    flush
    @retry="$emit('retry')"
  >
    <template #aside>
      <div class="flex flex-wrap gap-2">
        <PInput
          v-model="query"
          type="search"
          icon="magnifying-glass"
          :placeholder="t('community.members.searchPlaceholder')"
          :aria-label="t('community.members.search')"
          class="min-w-[200px]"
        />
        <PButton
          variant="outline"
          :icon="ascending ? 'arrow-up' : 'arrow-down'"
          :aria-label="t('community.members.orderLabel', { dir })"
          @click="ascending = !ascending"
        >
          {{ dir }}
        </PButton>
      </div>
    </template>

    <div
      v-if="shown.length"
      class="overflow-x-auto"
      tabindex="0"
      role="region"
      :aria-label="t('community.members.table')"
    >
      <table class="w-full border-collapse text-sm leading-5">
        <caption class="sr-only">
          {{
            t('community.members.table')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" :class="[th, 'text-right']">{{ t('community.members.place') }}</th>
            <th scope="col" :class="[th, 'text-left']">{{ t('community.members.player') }}</th>
            <th scope="col" :class="[th, 'text-left']">{{ t('community.members.form') }}</th>
            <th scope="col" :class="[th, 'text-left']">{{ t('community.members.role') }}</th>
            <th scope="col" :class="[th, 'text-right']">{{ t('community.members.points') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in shown"
            :key="r.id"
            class="group"
            :class="r.you ? 'me' : ''"
            :aria-current="r.you ? 'true' : undefined"
          >
            <td
              :class="[
                td,
                'text-right tabular-nums',
                r.you ? 'bg-tint text-tint-fg' : 'group-hover:bg-surface-hover',
              ]"
            >
              <b class="text-heading">{{ formatOrdinal(r.place) }}</b>
              <RankMove :value="r.move" class="ml-1" />
            </td>
            <td :class="[td, r.you ? 'bg-tint text-tint-fg' : 'group-hover:bg-surface-hover']">
              <RouterLink
                :to="`/u/${encodeURIComponent(r.username)}`"
                class="text-heading inline-flex min-h-11 items-center gap-2 font-semibold md:min-h-8"
              >
                <Avatar :name="r.username" :size="24" :you="r.you" aria-hidden="true" />
                <span class="max-w-[28ch] truncate" :title="r.username">{{ r.username }}</span>
                <span v-if="r.you" class="sr-only">{{ t('community.members.you') }}</span>
              </RouterLink>
            </td>
            <td :class="[td, r.you ? 'bg-tint' : 'group-hover:bg-surface-hover']">
              <FormStrip :entries="r.form" />
            </td>
            <td :class="[td, r.you ? 'bg-tint' : 'group-hover:bg-surface-hover']">
              <PTag :color="r.role === 'owner' ? 'brand' : 'gray'">{{
                t(r.role === 'owner' ? 'community.members.owner' : 'community.members.playerRole')
              }}</PTag>
            </td>
            <td
              :class="[
                td,
                'text-right tabular-nums',
                r.you ? 'bg-tint text-tint-fg' : 'group-hover:bg-surface-hover',
              ]"
            >
              <b class="text-heading">{{ formatPoints(r.points) }}</b>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState
      v-else
      icon="search_off"
      :title="rows?.length ? t('community.members.empty') : t('community.members.noMembers')"
      :text="rows?.length ? t('community.members.emptyText') : ''"
    />

    <template #footer>
      <span class="text-muted mr-auto text-sm">{{
        t(
          'community.members.showing',
          { shown: shown.length, m: rows?.length ?? 0 },
          rows?.length ?? 0,
        )
      }}</span>
    </template>
  </CommunityCard>
</template>
