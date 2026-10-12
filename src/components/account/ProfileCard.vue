<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CommunityCard from '@/components/community/CommunityCard.vue'
import PButton from '@/components/ui/PButton.vue'
import PInput from '@/components/ui/PInput.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTextarea from '@/components/ui/PTextarea.vue'
import { BIO_MAX, type TimezoneOption } from '@/lib/account'

/**
 * «Perfil» card (U3, `#datos`). Desktop: all fields, saved through the page's SaveBar. `compact`
 * (mobile): bio, location and time zone with their own «Guardar» button (`save` event).
 */
const props = defineProps<{
  errors: Partial<Record<'bio' | 'location' | 'birthdate' | 'timeZone', string>>
  /** There are unsaved changes (enables the mobile «Guardar»). */
  dirty?: boolean
  username?: string
  timezones?: TimezoneOption[]
  compact?: boolean
  saving?: boolean
  loading?: boolean
  error?: unknown
}>()
const bio = defineModel<string>('bio', { default: '' })
const location = defineModel<string>('location', { default: '' })
const birthdate = defineModel<string>('birthdate', { default: '' })
const timeZone = defineModel<string>('timeZone', { default: '' })
defineEmits<{ save: []; retry: [] }>()
const { t } = useI18n()

const zoneOptions = computed(() => {
  const list = props.timezones ?? []
  const current = timeZone.value
  return current && !list.some((o) => o.value === current)
    ? [{ value: current, label: current.replaceAll('_', ' ') }, ...list]
    : list
})
</script>

<template>
  <CommunityCard
    :title="t('account.profile.title')"
    :loading="loading"
    :error="error"
    :what="t('account.loadError')"
    :lines="5"
    @retry="$emit('retry')"
  >
    <template v-if="!compact" #aside>
      <span class="text-muted text-sm">{{ t('account.profile.text') }}</span>
    </template>
    <form class="grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="$emit('save')">
      <PInput
        v-if="!compact"
        :model-value="username ?? ''"
        :label="t('account.profile.username')"
        :help="t('account.profile.usernameHelp')"
        disabled
        autocomplete="username"
      />
      <PInput
        v-if="!compact"
        v-model="birthdate"
        type="date"
        :label="t('account.profile.birthdate')"
        :error="errors.birthdate"
        autocomplete="bday"
      />
      <div class="sm:col-span-2">
        <PTextarea
          v-model="bio"
          :label="t('account.profile.bio')"
          :help="t('account.profile.bioCounter', { n: bio.length, max: BIO_MAX })"
          :error="errors.bio"
          rows="3"
          data-testid="bio"
        />
      </div>
      <PInput
        v-model="location"
        :label="t('account.profile.location')"
        :error="errors.location"
        autocomplete="address-level2"
      />
      <div class="sm:col-span-2">
        <PSelect
          v-model="timeZone"
          :label="t('account.profile.timeZone')"
          :help="t('account.profile.timeZoneHelp')"
          :options="zoneOptions"
        />
      </div>
      <PButton v-if="compact" type="submit" block size="lg" :loading="saving" :disabled="!dirty">
        {{ t('account.profile.save') }}
      </PButton>
    </form>
  </CommunityCard>
</template>
