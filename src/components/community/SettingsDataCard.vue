<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PTag from '@/components/ui/PTag.vue'
import { accessText } from '@/lib/community-settings'
import CommunityCard from './CommunityCard.vue'

/**
 * «Datos» block of the settings (H6): name, access and description as read-only TEXT with their
 * label (a `dl`, not disabled inputs), the «Solo lectura» tag and the literal notice that the API
 * does not allow editing them. Props: `name`, `open`, `description`, `loading`, `error`.
 */
defineProps<{
  name: string
  open?: boolean
  description?: string | null
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
const box = 'bg-surface-muted text-muted rounded-md px-3 py-2 text-sm leading-6 break-words'
</script>

<template>
  <CommunityCard
    :title="t('communitySettings.data.title')"
    :loading="loading"
    :error="error"
    :what="t('communitySettings.error.data')"
    @retry="$emit('retry')"
  >
    <template #aside>
      <PTag icon="lock">{{ t('communitySettings.readOnly') }}</PTag>
    </template>
    <div class="flex flex-col gap-4">
      <PrognoAlert variant="info" :title="t('communitySettings.data.notice')" />
      <dl class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <dt class="text-body text-xs leading-4 font-bold tracking-wide uppercase">
            {{ t('communitySettings.data.name') }}
          </dt>
          <dd :class="box">{{ name }}</dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="text-body text-xs leading-4 font-bold tracking-wide uppercase">
            {{ t('communitySettings.data.access') }}
          </dt>
          <dd :class="box">{{ accessText(open) }}</dd>
        </div>
        <div class="flex flex-col gap-1 sm:col-span-2">
          <dt class="text-body text-xs leading-4 font-bold tracking-wide uppercase">
            {{ t('communitySettings.data.description') }}
          </dt>
          <dd :class="[box, 'min-h-14']">
            {{ description || t('communitySettings.data.noDescription') }}
          </dd>
        </div>
      </dl>
    </div>
  </CommunityCard>
</template>
