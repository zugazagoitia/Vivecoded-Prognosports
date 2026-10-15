<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Community } from '@/api/schemas'
import PButton from '@/components/ui/PButton.vue'
import PTag from '@/components/ui/PTag.vue'
import { createdYear, isOwner } from '@/lib/communities'
import type { PendingInfo, StandingState } from '@/queries/communities'
import CommunityMark from './CommunityMark.vue'
import CommunityStatus from './CommunityStatus.vue'

/**
 * Card of one of the user's communities (H2): avatar (image or initials on a token colour), name,
 * creator and year, access / players / rules tags, situation rows and the actions.
 *
 * Props:
 *  - `community`  the community (from `useMyCommunities`).
 *  - `userId`     signed-in user id ("Creada por Tú").
 *  - `active`     draws the ring and the «Activa» tag, hides «Hacer activa».
 *  - `state`      standing state (`useCommunityStandings`); omit with `compact`.
 *  - `pending`    pending predictions of the next GP (`useCommunityPending`), optional.
 *  - `compact`    hides the situation rows (useful for lists in H3/H6).
 * Emits: `activate` (id), `retry`.
 * Heading level: an `h3` (put the card under an `h2`).
 */
const props = defineProps<{
  community: Community
  userId?: number | undefined
  active?: boolean
  state?: StandingState
  pending?: PendingInfo | undefined
  compact?: boolean
}>()
defineEmits<{ activate: [id: number]; retry: [] }>()
const { t } = useI18n()

const owner = computed(() =>
  isOwner(props.community, props.userId)
    ? t('communities.card.you')
    : (props.community.owner?.username ?? ''),
)
const year = computed(() => createdYear(props.community.created))
const byline = computed(() => {
  if (!owner.value) return ''
  return year.value
    ? t('communities.card.createdBy', { owner: owner.value, year: year.value })
    : t('communities.card.createdByNoYear', { owner: owner.value })
})
const members = computed(() => props.community.membersAmount ?? 0)
const rules = computed(() => props.community.defaultRuleSet?.displayname)
const href = computed(() => `/comunidades/${props.community.id}`)
</script>

<template>
  <article
    :class="[
      'bg-surface flex min-w-0 flex-col gap-3.5 rounded-lg p-5 shadow-(--card-shadow) ring-1',
      active ? 'ring-primary ring-2' : 'ring-card-ring',
    ]"
    :data-active="active ? 'true' : undefined"
  >
    <header class="flex items-start gap-3">
      <CommunityMark :community="community" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 class="t-header text-heading wrap-anywhere">{{ community.name }}</h3>
        <p v-if="byline" class="text-muted text-sm wrap-anywhere">{{ byline }}</p>
      </div>
      <PTag v-if="active" color="solid">{{ t('communities.card.active') }}</PTag>
    </header>

    <div class="flex flex-wrap gap-1.5">
      <PTag v-if="community.open" color="ok" icon="globe">{{ t('communities.card.open') }}</PTag>
      <PTag v-else color="brand" icon="lock">{{ t('communities.card.closed') }}</PTag>
      <PTag v-if="members > 0">{{ t('communities.card.players', { n: members }, members) }}</PTag>
      <PTag v-if="rules">{{ rules }}</PTag>
    </div>

    <CommunityStatus
      v-if="!compact && state"
      :state="state"
      :pending="pending"
      @retry="$emit('retry')"
    />

    <div class="mt-auto flex gap-2">
      <PButton
        variant="soft"
        size="sm"
        :to="href"
        class="flex-1"
        :aria-label="t('communities.card.openLabel', { name: community.name })"
        >{{ t('communities.card.openBtn') }}</PButton
      >
      <PButton
        v-if="!active"
        variant="outline"
        size="sm"
        :aria-label="t('communities.card.activateLabel', { name: community.name })"
        @click="$emit('activate', community.id)"
        >{{ t('communities.card.activate') }}</PButton
      >
    </div>
  </article>
</template>
