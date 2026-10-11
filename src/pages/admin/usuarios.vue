<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import Avatar from '@/components/ui/Avatar.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PInput from '@/components/ui/PInput.vue'
import PPagination from '@/components/ui/PPagination.vue'
import PTag from '@/components/ui/PTag.vue'
import { iconFor } from '@/components/ui/icons'
import { filterUsers, formatAlta, userRow, USERS_PAGE_SIZE } from '@/lib/adminPeople'
import { useAdminUsers } from '@/queries/admin'
import { useSessionStore } from '@/stores/session'

/**
 * M10 · Usuarios (`/admin/usuarios?q=`): read-only list. Only the fields the table shows are kept
 * from `GET /v2/user` (never `hashedPassword`). The number of communities per user is not in
 * `User` (por confirmar): that column is not shown.
 */
definePage({ meta: { title: 'route.adminUsers' } })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const q = useAdminUsers()

const rows = computed(() => (q.data.value ?? []).map(userRow))
const initial = typeof route.query.q === 'string' ? route.query.q : ''
const text = ref(initial)
const query = ref(initial)
const push = useDebounceFn((v: string) => {
  query.value = v.trim()
  page.value = 1
  void router.replace({ query: v.trim() ? { q: v.trim() } : {} })
}, 300)
watch(text, (v) => void push(v))
const page = ref(1)
const filtered = computed(() => filterUsers(rows.value, query.value))
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * USERS_PAGE_SIZE, page.value * USERS_PAGE_SIZE),
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminHeader :title="t('admin.users.title')" :subtitle="t('admin.users.subtitle')" />
    <p
      class="bg-info-tint text-info-fg flex items-start gap-3 rounded-sm px-4 py-3 text-sm"
      role="note"
    >
      <PIcon :name="iconFor('lock')" />
      {{ t('admin.users.notice') }}
    </p>
    <PCard :padded="false">
      <div class="border-border border-b p-4">
        <PInput
          v-model="text"
          type="search"
          icon="magnifying-glass"
          :aria-label="t('admin.users.search')"
          :placeholder="t('admin.users.searchPlaceholder')"
          :disabled="q.isLoading.value"
        />
      </div>
      <div class="p-4">
        <ErrorState
          v-if="q.isError.value"
          :what="t('admin.users.error')"
          :error="q.error.value"
          @retry="q.refetch()"
        />
        <Skeleton v-else-if="q.isLoading.value" variant="table" :rows="12" />
        <EmptyState
          v-else-if="!filtered.length"
          :title="t('admin.users.empty', { q: query })"
          icon="search_off"
        />
        <AdminTable v-else :caption="t('admin.users.caption')">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.users.user') }}</th>
              <th scope="col">{{ t('admin.users.email') }}</th>
              <th scope="col">{{ t('admin.users.created') }}</th>
              <th scope="col">{{ t('admin.users.state') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in visible" :key="u.id">
              <td>
                <span class="inline-flex items-center gap-2">
                  <Avatar :name="u.username" :size="24" :you="u.id === session.user?.id" />
                  <b class="text-heading">{{ u.username }}</b>
                </span>
              </td>
              <td>{{ u.email }}</td>
              <td>{{ formatAlta(u.created) }}</td>
              <td>
                <PTag :color="u.verified ? 'ok' : 'warn'">{{
                  t(u.verified ? 'admin.users.verified' : 'admin.users.unverified')
                }}</PTag>
              </td>
            </tr>
          </tbody>
        </AdminTable>
        <PPagination
          v-if="filtered.length > USERS_PAGE_SIZE"
          v-model="page"
          class="mt-4"
          :total="filtered.length"
          :per-page="USERS_PAGE_SIZE"
        />
      </div>
      <footer class="border-border text-muted border-t px-4 py-3 text-sm" aria-live="polite">
        {{ t('admin.users.count', { n: visible.length, total: rows.length }) }}
      </footer>
    </PCard>
  </div>
</template>
