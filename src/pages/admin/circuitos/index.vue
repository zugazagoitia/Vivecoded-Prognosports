<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import { iconFor } from '@/components/ui/icons'
import { circuitRow, sortCircuits } from '@/lib/adminCatalog'
import { useAdminCircuits } from '@/queries/admin'

/** M6 · Circuitos (`/admin/circuitos`): catalogue list. The length is the first variant's (por confirmar). */
definePage({ meta: { title: 'route.adminCircuits' } })

const { t } = useI18n()
const q = useAdminCircuits()
const rows = computed(() => sortCircuits(q.data.value ?? []).map(circuitRow))
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminHeader :title="t('admin.circuits.title')" :subtitle="t('admin.circuits.subtitle')">
      <PButton to="/admin/circuitos/nuevo" :icon="iconFor('add')">{{
        t('admin.circuits.new')
      }}</PButton>
    </AdminHeader>
    <PCard :padded="false">
      <div class="p-4">
        <ErrorState
          v-if="q.isError.value"
          :what="t('admin.circuits.error')"
          :error="q.error.value"
          @retry="q.refetch()"
        />
        <Skeleton v-else-if="q.isLoading.value" variant="table" :rows="8" />
        <EmptyState v-else-if="!rows.length" :title="t('admin.circuits.empty')" icon="route">
          <PButton to="/admin/circuitos/nuevo" :icon="iconFor('add')">{{
            t('admin.circuits.new')
          }}</PButton>
        </EmptyState>
        <AdminTable v-else :caption="t('admin.circuits.caption')">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.circuits.name') }}</th>
              <th scope="col">{{ t('admin.circuits.country') }}</th>
              <th scope="col" class="r">{{ t('admin.circuits.variants') }}</th>
              <th scope="col" class="r">{{ t('admin.circuits.length') }}</th>
              <th scope="col">
                <span class="sr-only">{{ t('admin.circuits.actions') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td>
                <b class="text-heading">{{ r.name }}</b>
              </td>
              <td>{{ r.country }}</td>
              <td class="r">{{ r.variants }}</td>
              <td class="r">{{ r.length }}</td>
              <td class="r">
                <PButton
                  variant="ghost"
                  size="sm"
                  :to="`/admin/circuitos/${r.id}`"
                  :aria-label="t('admin.circuits.editAria', { name: r.name })"
                  >{{ t('admin.circuits.edit') }}</PButton
                >
              </td>
            </tr>
          </tbody>
        </AdminTable>
      </div>
    </PCard>
  </div>
</template>
