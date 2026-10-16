<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PTag from '@/components/ui/PTag.vue'

/**
 * «Próximamente» placeholders for profile data the API does not expose yet: Telegram,
 * level/XP and «Campeón/a». Remove each one when the backend provides it.
 */
withDefaults(defineProps<{ telegram?: boolean; champion?: boolean }>(), {
  telegram: false,
  champion: true,
})
const { t } = useI18n()
</script>

<template>
  <ul class="m-0 flex list-none flex-wrap gap-2 p-0" data-testid="profile-soon">
    <li v-if="champion">
      <PTag color="gray">{{ t('profile.soon.champion') }}</PTag>
    </li>
    <li>
      <PTag color="gray">{{ t('profile.soon.level') }}</PTag>
    </li>
    <li v-if="telegram">
      <PTag color="gray">{{ t('profile.soon.telegram') }}</PTag>
    </li>
  </ul>
</template>
