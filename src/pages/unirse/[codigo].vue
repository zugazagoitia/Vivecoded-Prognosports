<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { competitionsApi } from '@/api'
import CommunityMark from '@/components/communities/CommunityMark.vue'
import { ErrorState } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useToast } from '@/composables/useToast'
import {
  invitationState,
  inviteSubtitle,
  redirectUrl,
  rulesSentence,
  summarizeRules,
} from '@/lib/invitation'
import {
  InvalidInvitationError,
  competitionOf,
  useInvitation,
  useJoinCommunity,
} from '@/queries/communities'
import { keys } from '@/queries/keys'
import { useSessionStore } from '@/stores/session'

/**
 * Invitation page (H7), `/unirse/:codigo`. Public to view, needs a session to join. Shows ONE of
 * three states: valid (community data + «Unirme»), invalid (unknown code), expired (rejected join) or already a
 * member. Without a session a banner sends to `/login?redirect=/unirse/:codigo` (login and
 * register keep the redirect). The community is resolved from the public list by invitation code.
 */
definePage({ meta: { layout: 'app', title: 'route.invitation' } })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const session = useSessionStore()

const code = computed(() => String((route.params as { codigo?: string }).codigo ?? ''))
const { query, parsed, isMember, mine } = useInvitation(code)
const join = useJoinCommunity()
const rejected = ref(false)
const joinError = ref(false)

const community = computed(() => query.data.value ?? undefined)
const loading = computed(
  () => query.isLoading.value || (session.isAuthenticated && mine.isLoading.value),
)
const state = computed(() =>
  rejected.value
    ? 'expired'
    : invitationState({ community: community.value, isMember: isMember.value }),
)

const comp = computed(() => (community.value ? competitionOf(community.value) : undefined))
const season = useQuery({
  queryKey: computed(() => keys.currentSeason(comp.value ?? '')),
  queryFn: ({ signal }) => competitionsApi.getCurrentSeason(comp.value!, signal),
  enabled: computed(() => comp.value != null && state.value === 'valid'),
  retry: false,
})

const subtitle = computed(() => {
  const c = community.value
  if (!c) return ''
  const name = c.competition?.fullname ?? c.competition?.name ?? ''
  const label = [name, season.data.value?.name].filter(Boolean).join(' ')
  return inviteSubtitle(t, {
    owner: c.owner?.username,
    members: t('invitation.valid.players', { n: c.membersAmount ?? 0 }, c.membersAmount ?? 0),
    competition: label,
  })
})
const sentence = computed(() => {
  const c = community.value
  const s = summarizeRules(c?.defaultRuleSet?.data)
  if (!c || !s) return ''
  return rulesSentence(t, c.defaultRuleSet?.displayname ?? undefined, s.exact, s.near, s.far)
})

const loginTo = computed(() => redirectUrl(parsed.value))

async function accept() {
  const c = community.value
  if (!c || join.isPending.value) return
  joinError.value = false
  try {
    const joined = await join.mutateAsync({ code: parsed.value, communityId: c.id })
    toast.success(t('communities.join.joined', { name: joined.name }))
    void router.push(`/comunidades/${joined.id}`)
  } catch (e) {
    if (e instanceof InvalidInvitationError) rejected.value = true
    else joinError.value = true
  }
}

// Move focus to the new heading when the state changes after the first render.
const root = useTemplateRef<HTMLElement>('root')
watch(state, async () => {
  await nextTick()
  root.value?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
})
</script>

<template>
  <div ref="root" class="pg-main container-sm flex flex-col gap-4">
    <ErrorState
      v-if="query.isError.value"
      :what="t('invitation.error')"
      :error="query.error.value"
      @retry="query.refetch()"
    />

    <PCard v-else-if="loading" tag="div">
      <div class="flex flex-col gap-4" aria-hidden="true">
        <div class="skel size-18 rounded-2xl" />
        <div class="skel h-4 w-3/4 rounded" />
        <div class="skel h-4 w-1/2 rounded" />
        <div class="skel h-4 w-2/3 rounded" />
        <div class="skel h-11 rounded-lg" />
      </div>
      <p class="sr-only" role="status">{{ t('invitation.loading') }}</p>
    </PCard>

    <PCard v-else-if="state === 'valid' && community" tag="article" data-state="valid">
      <div class="flex flex-col gap-4">
        <div>
          <PTag color="ok" icon="check">{{ t('invitation.valid.tag') }}</PTag>
        </div>
        <div class="flex items-center gap-4">
          <CommunityMark :community="community" :size="72" />
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="t-up text-muted">{{ t('invitation.valid.invitedTo') }}</span>
            <PTitle class="break-words focus:outline-none" tabindex="-1">{{
              community.name
            }}</PTitle>
          </div>
        </div>
        <p class="text-muted text-sm">{{ subtitle }}</p>
        <div v-if="sentence" class="bg-surface-muted flex flex-col gap-1 rounded-lg p-4">
          <span class="t-up text-muted">{{ t('invitation.valid.rules') }}</span>
          <p class="text-body text-sm">{{ sentence }}</p>
        </div>
        <p v-if="joinError" class="text-err-fg text-sm" role="alert">
          {{ t('invitation.joinFailed') }}
        </p>
        <div class="flex flex-col gap-2">
          <PButton
            v-if="session.isAuthenticated"
            size="lg"
            block
            :loading="join.isPending.value"
            @click="accept"
            >{{ t('invitation.valid.join') }}</PButton
          >
          <PButton v-else size="lg" block :to="loginTo">{{
            t('invitation.valid.loginToJoin')
          }}</PButton>
          <PButton variant="ghost" block to="/comunidades">{{
            t('invitation.valid.decline')
          }}</PButton>
        </div>
      </div>
    </PCard>

    <PCard v-else-if="state === 'member' && community" tag="article" data-state="member">
      <div class="flex flex-col items-center gap-3 py-6 text-center">
        <PTag color="info" icon="circle-info">{{ t('invitation.member.tag') }}</PTag>
        <span
          class="bg-ok-tint text-ok-fg inline-flex size-14 items-center justify-center rounded-full"
        >
          <PIcon name="check" :size="24" />
        </span>
        <PTitle level="subtitle" as="h1" class="focus:outline-none" tabindex="-1">{{
          t('invitation.member.title', { name: community.name })
        }}</PTitle>
        <p class="text-muted text-sm">{{ t('invitation.member.text') }}</p>
        <PButton size="sm" :to="`/comunidades/${community.id}`">{{
          t('invitation.member.open')
        }}</PButton>
      </div>
    </PCard>

    <PCard v-else-if="state === 'invalid'" tag="article" data-state="invalid">
      <div class="flex flex-col items-center gap-3 py-6 text-center">
        <PTag color="err" icon="circle-exclamation">{{ t('invitation.invalid.tag') }}</PTag>
        <span
          class="bg-err-tint text-err-fg inline-flex size-14 items-center justify-center rounded-full"
        >
          <PIcon name="link-slash" :size="24" />
        </span>
        <PTitle level="subtitle" as="h1" class="focus:outline-none" tabindex="-1">{{
          t('invitation.invalid.title')
        }}</PTitle>
        <p class="text-muted text-sm">{{ t('invitation.invalid.text') }}</p>
        <PButton variant="outline" size="sm" to="/comunidades">{{
          t('invitation.invalid.retry')
        }}</PButton>
      </div>
    </PCard>

    <PCard v-else tag="article" data-state="expired">
      <div class="flex flex-col items-center gap-3 py-6 text-center">
        <PTag color="err" icon="circle-exclamation">{{ t('invitation.expired.tag') }}</PTag>
        <span
          class="bg-err-tint text-err-fg inline-flex size-14 items-center justify-center rounded-full"
        >
          <PIcon name="link-slash" :size="24" />
        </span>
        <PTitle level="subtitle" as="h1" class="focus:outline-none" tabindex="-1">{{
          t('invitation.expired.title')
        }}</PTitle>
        <p class="text-muted text-sm">{{ t('invitation.expired.text') }}</p>
        <PButton variant="outline" size="sm" to="/comunidades">{{
          t('invitation.expired.retry')
        }}</PButton>
      </div>
    </PCard>

    <aside
      v-if="!session.isAuthenticated"
      class="bg-tint text-tint-fg flex flex-wrap items-center gap-4 rounded-lg p-4"
      data-testid="login-banner"
    >
      <PIcon name="right-to-bracket" :size="24" />
      <p class="min-w-0 flex-1 text-sm">
        <strong>{{ t('invitation.banner.lead') }}</strong
        >{{ t('invitation.banner.text') }}
      </p>
      <PButton size="sm" :to="loginTo">{{ t('invitation.banner.cta') }}</PButton>
    </aside>
  </div>
</template>
