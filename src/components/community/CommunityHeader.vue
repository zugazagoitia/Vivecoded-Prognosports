<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Community } from '@/api/schemas'
import PButton from '@/components/ui/PButton.vue'
import PTag from '@/components/ui/PTag.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { formatCreated } from '@/lib/community'
import CommunityAvatar from './CommunityAvatar.vue'

/**
 * Identity header of a community: image/initials, name (`h1`), description, tags (access,
 * players, creator and date, competition · season) and the action buttons.
 *
 * Props: `community` (detail), `season` (name, e.g. «2026»), `you` (the signed-in user is the
 * creator: «Creada por ti»), `canSettings` (shows «Ajustes»), `rankingTo` (route of «Ver ranking»,
 * hidden without it). The buttons are also available through the `actions` slot (replaces them).
 * Reused by H4 (creation result), H6 (settings) and H7 (invitation preview) as a read-only block.
 */
const props = defineProps<{
  community: Community & { id: number }
  season?: string
  you?: boolean
  canSettings?: boolean
  rankingTo?: string
}>()
const { t } = useI18n()

const created = computed(() => {
  const date = formatCreated(props.community.created)
  const owner = props.community.owner?.username
  if (!date) return ''
  if (props.you) return t('community.header.createdByYou', { date })
  return owner
    ? t('community.header.createdBy', { name: owner, date })
    : t('community.header.created', { date })
})
const competition = computed(() =>
  [props.community.competition?.fullname ?? props.community.competition?.name, props.season]
    .filter(Boolean)
    .join(' · '),
)
const members = computed(() => props.community.membersAmount)
</script>

<template>
  <section
    class="bg-surface ring-card-ring flex flex-wrap items-center gap-6 rounded-lg p-5 shadow-(--card-shadow) ring-1"
  >
    <CommunityAvatar
      :id="community.id"
      :name="community.name"
      :has-image="community.hasImage"
      :size="72"
    />
    <div class="flex min-w-[260px] flex-1 flex-col gap-1.5">
      <PTitle>{{ community.name }}</PTitle>
      <p v-if="community.description" class="text-muted">{{ community.description }}</p>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li>
          <PTag
            :color="community.open ? 'ok' : 'brand'"
            :icon="community.open ? 'lock-open' : 'lock'"
          >
            {{ community.open ? t('community.header.open') : t('community.header.closed') }}
          </PTag>
        </li>
        <li v-if="members != null">
          <PTag>{{ t('players', { n: members }, members) }}</PTag>
        </li>
        <li v-if="created">
          <PTag>{{ created }}</PTag>
        </li>
        <li v-if="competition">
          <PTag>{{ competition }}</PTag>
        </li>
      </ul>
    </div>
    <slot name="actions">
      <div class="flex flex-wrap gap-2">
        <PButton
          v-if="canSettings"
          variant="outline"
          icon="gear"
          :to="`/comunidades/${community.id}/ajustes`"
        >
          {{ t('community.header.settings') }}
        </PButton>
        <PButton v-if="rankingTo" icon="ranking-star" :to="rankingTo">
          {{ t('community.header.ranking') }}
        </PButton>
      </div>
    </slot>
  </section>
</template>
