<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Community } from '@/api/schemas'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useToast } from '@/composables/useToast'
import { InvalidInvitationError, useJoinCommunity } from '@/queries/communities'

/**
 * «Unirme con un código» form (H2), reusable by the invitation page (H7).
 *
 * Accepts a bare code or an invitation link (the last path segment is used). The community is
 * resolved from the code (`communitiesApi.findCommunityByInvitation`) unless `communityId` is
 * given. On success the community becomes the active one, a toast is shown and `joined` is
 * emitted with the community (the parent navigates to `/comunidades/:id`).
 * An unknown / rejected code shows «Este código no es válido o ha caducado.»; it disappears when
 * the user types again.
 *
 * Props: `communityId` (optional), `bare` (no card/title, only the form).
 * Emits: `joined` (Community).
 */
const props = defineProps<{ communityId?: number | string; bare?: boolean }>()
const emit = defineEmits<{ joined: [community: Community] }>()
const { t } = useI18n()
const toast = useToast()
const join = useJoinCommunity()

const code = ref('')
const error = ref('')
watch(code, () => {
  error.value = ''
})

async function submit() {
  if (join.isPending.value) return
  error.value = ''
  try {
    const community = await join.mutateAsync({ code: code.value, communityId: props.communityId })
    toast.success(t('communities.join.joined', { name: community.name }))
    code.value = ''
    emit('joined', community)
  } catch (e) {
    error.value =
      e instanceof InvalidInvitationError
        ? t('communities.join.invalid')
        : t('communities.join.failed')
  }
}
</script>

<template>
  <component :is="bare ? 'div' : PCard">
    <div class="flex flex-col gap-3">
      <template v-if="!bare">
        <PTitle level="header" as="h2">{{ t('communities.join.title') }}</PTitle>
        <p class="text-muted text-sm">{{ t('communities.join.text') }}</p>
      </template>
      <form class="flex flex-col gap-3" novalidate @submit.prevent="submit">
        <PInput
          v-model="code"
          icon="key"
          :label="t('communities.join.label')"
          :placeholder="t('communities.join.placeholder')"
          :error="error"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
        />
        <PButton type="submit" block :loading="join.isPending.value">{{
          t('communities.join.submit')
        }}</PButton>
      </form>
    </div>
  </component>
</template>
