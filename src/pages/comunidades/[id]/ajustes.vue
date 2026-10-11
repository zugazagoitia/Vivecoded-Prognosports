<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import CommunityImageCard from '@/components/community/CommunityImageCard.vue'
import SettingsDataCard from '@/components/community/SettingsDataCard.vue'
import SettingsInviteCard from '@/components/community/SettingsInviteCard.vue'
import SettingsMembersCard from '@/components/community/SettingsMembersCard.vue'
import SettingsRulesCard from '@/components/community/SettingsRulesCard.vue'
import { ErrorState, Skeleton } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileBackHref, useMobileTitle } from '@/composables/useMobileNav'
import { toaster } from '@/composables/useToast'
import { SETTINGS_SECTIONS } from '@/lib/community-settings'
import {
  useCommunityDetail,
  useCommunityMembers,
  useCommunityPermissions,
  useCommunityRuleset,
  useCommunitySeason,
  useDeleteCommunityImage,
  useRegenerateInvitation,
  useRulesetUsages,
  useUploadCommunityImage,
  type SeasonArgs,
} from '@/queries/community'
import { seasonSessions } from '@/lib/community'
import { useSeasonGps } from '@/queries/circuits'
import { useSessionStore } from '@/stores/session'

/**
 * Community settings (H6), `/comunidades/:id/ajustes`: an index («En esta página», sticky on
 * desktop, chips on mobile) and five cards: Imagen (upload with crop / remove), Invitación (copy
 * and regenerate), and read-only Datos, Reglas de puntuación and Miembros (the API cannot edit
 * name, description, access or rules).
 *
 * Access: needs a session and `permissions.settings` (the creator or a member with a delegated
 * `can_*`). Not a member -> `/comunidades`; a member without permission -> back to the community
 * (H5) with an info toast; an unknown id shows an own 404. Anchors: `#imagen`, `#invitacion`,
 * `#datos`, `#reglas`, `#miembros`.
 */
definePage({
  meta: {
    layout: 'app',
    title: 'route.communitySettings',
    guards: ['auth', 'verified'],
    backHref: '/comunidades',
  },
})

const { t } = useI18n()
const route = useRoute('/comunidades/[id]/ajustes')
const router = useRouter()
const session = useSessionStore()
const mobile = useMediaQuery(MOBILE_QUERY)

const id = computed(() => String(route.params.id))
const detail = useCommunityDetail(id)
const community = computed(() => detail.data.value)
const members = useCommunityMembers(id)
const perms = useCommunityPermissions(community, () => members.data.value)
const seasonQ = useCommunitySeason(community)
const args = computed<SeasonArgs>(() => ({
  community: id.value,
  competition: seasonQ.competition.value,
  season: seasonQ.data.value?.id,
}))
const ruleset = useCommunityRuleset(args)
const gps = useSeasonGps(
  () => args.value.competition ?? '',
  () => args.value.season,
)
const usages = useRulesetUsages(() => ruleset.data.value?.id)
const sessions = computed(() => seasonSessions(gps.data.value ?? []))

const upload = useUploadCommunityImage(id)
const remove = useDeleteCommunityImage(id)
const regenerate = useRegenerateInvitation(id)
const cropping = ref(false)
const imageVersion = ref(0)

useMobileTitle(() => t('communitySettings.mobileTitle'))
useMobileBackHref(() => `/comunidades/${id.value}`)

// Access: nothing of the settings is rendered until the permissions are known.
const known = computed(
  () => !!community.value && (members.isSuccess.value || members.isError.value),
)
const allowed = computed(() => perms.value.settings)
watch(
  () => [detail.notMember.value, known.value, allowed.value, members.isSuccess.value] as const,
  ([notMember, isKnown, ok, membersOk]) => {
    if (notMember) {
      toaster.info(t('community.notMember'))
      void router.replace('/comunidades')
    } else if (isKnown && !ok && membersOk) {
      toaster.info(t('communitySettings.denied'))
      void router.replace(`/comunidades/${id.value}`)
    }
  },
  { immediate: true },
)
const visible = computed(() => !!community.value && allowed.value)

function onUpload(blob: Blob) {
  upload.mutate(blob, {
    onSuccess: () => {
      cropping.value = false
      imageVersion.value = Date.now()
    },
  })
}

/** Moves the focus to the section heading after the anchor jump (router scrolls to the hash). */
async function focusSection(section: string) {
  await nextTick()
  const heading = document.querySelector<HTMLElement>(`#${section} h2`)
  if (!heading) return
  heading.tabIndex = -1
  heading.focus({ preventScroll: true })
}
watch(
  visible,
  (v) => {
    if (v && route.hash) void focusSection(route.hash.slice(1))
  },
  { immediate: true },
)
</script>

<template>
  <div class="pg-main lg flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <template v-if="detail.notFound.value">
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('community.list'), to: '/comunidades' },
          { label: t('community.notFound.title') },
        ]"
      />
      <section class="flex flex-col items-center gap-3 py-12 text-center">
        <PTitle>{{ t('community.notFound.title') }}</PTitle>
        <p class="text-muted max-w-md">{{ t('community.notFound.text') }}</p>
        <PButton to="/comunidades" icon="users">{{ t('community.notFound.action') }}</PButton>
      </section>
    </template>

    <template v-else>
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('community.list'), to: '/comunidades' },
          { label: community?.name ?? t('loading'), to: `/comunidades/${id}` },
          { label: t('communitySettings.crumb') },
        ]"
      />
      <div class="flex flex-col gap-1">
        <PTitle>{{ t('communitySettings.title') }}</PTitle>
        <p class="text-muted">{{ t('communitySettings.adminsOnly') }}</p>
      </div>

      <ErrorState
        v-if="detail.isError.value && !detail.notMember.value"
        :what="t('community.error.community')"
        :error="detail.error.value"
        @retry="detail.refetch()"
      />
      <ErrorState
        v-else-if="community && members.isError.value && !allowed"
        :what="t('communitySettings.error.members')"
        :error="members.error.value"
        @retry="members.refetch()"
      />
      <div v-else-if="!visible" class="flex flex-col gap-6">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>

      <div
        v-else-if="community"
        class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 min-[901px]:grid-cols-[200px_minmax(0,1fr)]"
      >
        <nav
          :aria-label="t('communitySettings.toc')"
          class="min-[901px]:sticky min-[901px]:top-[72px]"
        >
          <ul
            class="m-0 flex list-none gap-1 overflow-x-auto p-0 max-[900px]:pb-1 min-[901px]:flex-col min-[901px]:gap-0.5"
          >
            <li v-for="s in SETTINGS_SECTIONS" :key="s">
              <RouterLink
                :to="{ hash: `#${s}` }"
                replace
                class="text-muted hover:bg-surface-muted hover:text-heading focus-visible:outline-focus-ring max-[900px]:bg-surface-muted inline-flex min-h-11 items-center rounded-md px-2.5 py-1.5 text-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 min-[901px]:flex min-[901px]:min-h-9"
                @click="focusSection(s)"
              >
                {{ t(`communitySettings.sections.${s}`) }}
              </RouterLink>
            </li>
          </ul>
        </nav>

        <div class="flex min-w-0 flex-col gap-6">
          <section id="imagen" class="scroll-mt-20">
            <CommunityImageCard
              :id="community.id ?? id"
              v-model:cropping="cropping"
              :name="community.name ?? ''"
              :has-image="community.hasImage"
              :version="imageVersion"
              :uploading="upload.isPending.value"
              :removing="remove.isPending.value"
              @upload="onUpload"
              @remove="remove.mutate()"
            />
          </section>
          <section id="invitacion" class="scroll-mt-20">
            <SettingsInviteCard
              :invitation="community.invitation"
              :open="community.open"
              :regenerating="regenerate.isPending.value"
              @regenerate="regenerate.mutate()"
            />
          </section>
          <section id="datos" class="scroll-mt-20">
            <SettingsDataCard
              :name="community.name ?? ''"
              :open="community.open"
              :description="community.description"
            />
          </section>
          <section id="reglas" class="scroll-mt-20">
            <SettingsRulesCard
              :ruleset="ruleset.data.value"
              :sessions="sessions"
              :usages="usages.data.value"
              :loading="ruleset.isLoading.value || gps.isLoading.value"
              :error="ruleset.error.value"
              @retry="ruleset.refetch()"
            />
          </section>
          <section id="miembros" class="scroll-mt-20">
            <SettingsMembersCard
              :members="members.data.value"
              :user-id="session.user?.id"
              :loading="members.isLoading.value"
              :error="members.error.value"
              @retry="members.refetch()"
            />
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
