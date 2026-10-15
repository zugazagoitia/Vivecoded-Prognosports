<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'
import PTag from '@/components/ui/PTag.vue'
import { memberSince } from '@/lib/profile'
import ProfileAvatar from './ProfileAvatar.vue'
import ProfileSoon from './ProfileSoon.vue'
import { useProfile } from './useProfile'

/** Identity card: avatar, name, «location · since», bio, tags and the link to the settings. */
const props = defineProps<{ compact?: boolean }>()
const { t } = useI18n()
const profile = useProfile()
const user = computed(() => profile.scope.user)
const name = computed(() => user.value?.username ?? '')
const since = computed(() => memberSince(user.value?.created))
const line = computed(() =>
  [
    user.value?.location?.trim() || undefined,
    since.value && !props.compact ? t('profile.header.since', { date: since.value }) : undefined,
  ]
    .filter(Boolean)
    .join(' · '),
)
const count = computed(() => profile.communities.data?.length ?? 0)
</script>

<template>
  <section
    class="bg-surface ring-card-ring min-w-0 rounded-lg shadow-(--card-shadow) ring-1"
    :class="props.compact ? 'p-4' : 'p-6'"
    aria-labelledby="profile-name"
  >
    <div
      class="flex gap-6"
      :class="props.compact ? 'flex-col items-center gap-3 text-center' : 'flex-wrap items-center'"
    >
      <ProfileAvatar
        v-if="user"
        :id="user.id"
        :name="name"
        :has-image="user.hasProfileImage === true"
        :size="props.compact ? 72 : 88"
      />
      <div
        class="flex min-w-0 flex-col gap-1"
        :class="props.compact ? 'items-center' : 'min-w-[260px] flex-1'"
      >
        <component
          :is="props.compact ? 'p' : 'h1'"
          id="profile-name"
          class="text-heading m-0 font-bold"
          :class="props.compact ? 'text-base' : 'text-[28px] leading-9 max-[640px]:text-2xl'"
        >
          {{ name }}
        </component>
        <p v-if="line" class="text-muted m-0 text-sm">{{ line }}</p>
        <p v-if="user?.bio" class="text-body m-0 max-w-[560px] text-sm">{{ user.bio }}</p>
        <div class="mt-1 flex flex-wrap gap-2" :class="props.compact ? 'justify-center' : ''">
          <PTag v-if="profile.title" color="brand" icon="trophy">
            {{ t('profile.header.champion', { year: profile.title }) }}
          </PTag>
          <PTag v-if="!props.compact && count > 0" color="gray">
            {{ t('profile.header.communities', { n: count }, count) }}
          </PTag>
        </div>
        <ProfileSoon
          :telegram="!props.compact"
          :champion="!profile.title"
          :class="props.compact ? 'justify-center' : ''"
        />
      </div>
      <PButton v-if="!props.compact" to="/ajustes" variant="outline" size="sm" icon="gear">
        {{ t('profile.header.settings') }}
      </PButton>
    </div>
  </section>
</template>
