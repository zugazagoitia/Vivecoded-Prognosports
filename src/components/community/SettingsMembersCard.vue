<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { EmptyState } from '@/components/states'
import Avatar from '@/components/ui/Avatar.vue'
import type { CommunityMember } from '@/lib/community'
import CommunityCard from './CommunityCard.vue'

/**
 * «Miembros» block of the settings (H6), read-only: one chip per member with avatar and name
 * (no kick/permission actions). Props: `members`, `userId` (the signed-in user, marked «(tú)»),
 * `loading`, `error`. Emits `retry`.
 */
defineProps<{
  members?: readonly CommunityMember[]
  userId?: number
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>

<template>
  <CommunityCard
    :title="t('communitySettings.members.title')"
    :loading="loading"
    :error="error"
    :what="t('communitySettings.error.members')"
    @retry="$emit('retry')"
  >
    <template v-if="members" #aside>
      <span class="text-muted text-sm">{{
        t('communitySettings.members.count', { n: members.length }, members.length)
      }}</span>
    </template>
    <ul
      v-if="members?.length"
      class="m-0 flex list-none flex-wrap gap-2 p-0"
      :aria-label="t('communitySettings.members.list')"
    >
      <li
        v-for="m in members"
        :key="m.id"
        class="bg-surface-muted text-body inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm"
      >
        <Avatar :name="m.username" :size="24" :you="m.id === userId" />
        <span>{{ m.username }}</span>
        <span v-if="m.id === userId" class="text-muted">{{
          t('communitySettings.members.you')
        }}</span>
      </li>
    </ul>
    <EmptyState v-else icon="users" :title="t('communitySettings.members.none')" />
  </CommunityCard>
</template>
