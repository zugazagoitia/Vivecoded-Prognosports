<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import { iconFor } from '@/components/ui/icons'
import { accessTag, communityRow, sortByMembers } from '@/lib/adminPeople'
import { useAdminCommunities } from '@/queries/admin'

/** M11 · Comunidades (`/admin/comunidades`): read-only list ordered by number of players. */
definePage({ meta: { title: 'route.adminCommunities' } })

const { t } = useI18n()
const q = useAdminCommunities()
const rows = computed(() => sortByMembers((q.data.value ?? []).map(communityRow)))
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminHeader
      :title="t('admin.communities.title')"
      :subtitle="t('admin.communities.subtitle')"
    />
    <p
      class="bg-info-tint text-info-fg flex items-start gap-3 rounded-sm px-4 py-3 text-sm"
      role="note"
    >
      <PIcon :name="iconFor('lock')" />
      {{ t('admin.communities.notice') }}
    </p>
    <PCard :padded="false">
      <div class="p-4">
        <ErrorState
          v-if="q.isError.value"
          :what="t('admin.communities.error')"
          :error="q.error.value"
          @retry="q.refetch()"
        />
        <Skeleton v-else-if="q.isLoading.value" variant="table" :rows="6" />
        <EmptyState v-else-if="!rows.length" :title="t('admin.communities.empty')" icon="groups" />
        <AdminTable v-else :caption="t('admin.communities.caption')">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.communities.community') }}</th>
              <th scope="col">{{ t('admin.communities.access') }}</th>
              <th scope="col" class="r">{{ t('admin.communities.players') }}</th>
              <th scope="col">{{ t('admin.communities.rules') }}</th>
              <th scope="col">
                <span class="sr-only">{{ t('admin.communities.actions') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in rows" :key="c.id">
              <td>
                <b class="text-heading">{{ c.name }}</b>
              </td>
              <td>
                <PTag :color="accessTag({ open: c.open }).color">{{
                  t(`admin.communities.${accessTag({ open: c.open }).key}`)
                }}</PTag>
              </td>
              <td class="r">{{ c.members }}</td>
              <td>{{ c.rules ?? '—' }}</td>
              <td class="r">
                <PButton
                  variant="ghost"
                  size="sm"
                  :to="`/comunidades/${c.id}`"
                  :aria-label="t('admin.communities.viewAria', { name: c.name })"
                  >{{ t('admin.communities.view') }}</PButton
                >
              </td>
            </tr>
          </tbody>
        </AdminTable>
      </div>
    </PCard>
  </div>
</template>
