<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { messageFor } from '@/api/messages'
import { RouterLink, useRoute } from 'vue-router'
import EmailChangeForm from '@/components/account/EmailChangeForm.vue'
import NotificationsCard from '@/components/account/NotificationsCard.vue'
import PasswordChangeForm from '@/components/account/PasswordChangeForm.vue'
import PhotoCard from '@/components/account/PhotoCard.vue'
import ProfileCard from '@/components/account/ProfileCard.vue'
import SecurityCard from '@/components/account/SecurityCard.vue'
import SessionsCard from '@/components/account/SessionsCard.vue'
import TelegramCard from '@/components/account/TelegramCard.vue'
import CommunityCard from '@/components/community/CommunityCard.vue'
import BottomSheet from '@/components/data/BottomSheet.vue'
import ConfirmLeaveDialog from '@/components/data/ConfirmLeaveDialog.vue'
import SaveBar from '@/components/data/SaveBar.vue'
import { Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileBackHref, useMobileTitle } from '@/composables/useMobileNav'
import { useProfileForm } from '@/composables/useProfileForm'
import { toaster } from '@/composables/useToast'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import {
  ACCOUNT_SECTIONS,
  channelStates,
  diffPreferences,
  readPreferences,
  telegramUsername,
  togglePref,
  type ChannelId,
  type NotificationTypeId,
  type PrefMatrix,
} from '@/lib/account'
import {
  useAuthTokens,
  useDeletePhoto,
  useNotificationChannels,
  useRevokeOtherTokens,
  useRevokeToken,
  useTimezones,
  useUnlinkTelegram,
  useUpdatePreferences,
  useUpdateProfile,
  useUploadPhoto,
} from '@/queries/account'
import { useSessionStore } from '@/stores/session'

/**
 * Account settings (U3), `/ajustes`: profile, photo, e-mail and password, open sessions,
 * Telegram and the notification matrix. Desktop: an index («En esta página») and six cards;
 * Profile and Notifications accumulate changes saved with the SaveBar (all other cards act at
 * once). Mobile (AjustesMovil): Perfil (own «Guardar»), Avisos (saved at each change), Seguridad
 * (sheets for e-mail / password, «Cerrar las demás sesiones (n)») and Telegram.
 * Not built (not in the API / not designed): name, editable username, Telegram linking widget,
 * «Otros ajustes» (privacy, team names). Anchors: `#datos #foto #correo #sesiones #telegram #avisos`.
 */
definePage({
  meta: { layout: 'app', title: 'route.settings', guards: ['auth', 'verified'], backHref: '/u/me' },
})

const { t } = useI18n()
const route = useRoute()
const session = useSessionStore()
const mobile = useMediaQuery(MOBILE_QUERY)
useMobileTitle(() => t('account.mobileTitle'))
useMobileBackHref('/u/me')

const user = computed(() => session.user)
const profile = useProfileForm(user)
const timezones = useTimezones()
const tokens = useAuthTokens()
const channelsQ = useNotificationChannels()
const channels = computed(() => channelStates(channelsQ.data.value))
const tgUsername = computed(() => telegramUsername(user.value?.preferences))

// --- Notifications draft ---------------------------------------------------------------------
const original = computed<PrefMatrix>(() => readPreferences(user.value?.preferences))
const draft = ref<PrefMatrix>(original.value)
watch(original, (v) => (draft.value = v))
const prefChanges = computed(() => diffPreferences(original.value, draft.value))

const count = computed(() => profile.count.value + prefChanges.value.length)
const dirty = computed(() => count.value > 0)
const saved = ref(false)
watch(dirty, (d) => d && (saved.value = false))
const leave = useUnsavedChanges(dirty)

const updateProfile = useUpdateProfile()
const updatePrefs = useUpdatePreferences()
const saving = computed(() => updateProfile.isPending.value || updatePrefs.isPending.value)

async function saveAll() {
  if (!(await profile.validateAll())) return
  const results = await Promise.allSettled([
    profile.count.value
      ? updateProfile.mutateAsync({ patch: profile.patch.value, password: profile.password.value })
      : undefined,
    prefChanges.value.length ? updatePrefs.mutateAsync(prefChanges.value) : undefined,
  ])
  // A rejected profile (usually a wrong password) is shown under the field; other errors were
  // already toasted by the global handler. The bar stays visible.
  const [profileResult] = results
  if (profileResult.status === 'rejected')
    profile.passwordError.value = messageFor(profileResult.reason)
  if (results.every((r) => r.status === 'fulfilled')) {
    saved.value = true
    toaster.success(t('account.saveBar.saved'))
  }
}
function discard() {
  profile.reset()
  draft.value = original.value
}

function toggle(type: NotificationTypeId, channel: ChannelId) {
  draft.value = togglePref(draft.value, type, channel)
  if (!mobile.value) return
  // Mobile has no SaveBar: each switch is saved at once.
  updatePrefs.mutate([{ type, channel, toggleTo: draft.value[type][channel] }], {
    onSuccess: () => toaster.success(t('account.notifications.saved')),
    onError: () => (draft.value = original.value),
  })
}

async function saveProfileMobile() {
  if (!(await profile.validateAll())) return
  updateProfile.mutate(
    { patch: profile.patch.value, password: profile.password.value },
    {
      onSuccess: () => toaster.success(t('account.profile.saved')),
      onError: (e) => (profile.passwordError.value = messageFor(e)),
    },
  )
}

// --- Photo -----------------------------------------------------------------------------------
const upload = useUploadPhoto()
const removePhoto = useDeletePhoto()
const cropping = ref(false)
const photoVersion = ref(0)
function onUpload(blob: Blob) {
  upload.mutate(blob, {
    onSuccess: () => {
      cropping.value = false
      photoVersion.value = Date.now()
    },
  })
}
function onRemovePhoto() {
  removePhoto.mutate(undefined, { onSuccess: () => (photoVersion.value = Date.now()) })
}

// --- Sessions, Telegram, mobile security -----------------------------------------------------
const revoke = useRevokeToken()
const revokeOthers = useRevokeOtherTokens()
const unlink = useUnlinkTelegram()
const othersCount = computed(() => (tokens.data.value ?? []).filter((x) => !x.current).length)
const confirmOthers = ref(false)
const sheet = ref<'email' | 'password' | null>(null)

// --- Index -----------------------------------------------------------------------------------
async function focusSection(section: string) {
  await nextTick()
  const heading = document.querySelector<HTMLElement>(`#${section} h2`)
  if (!heading) return
  heading.tabIndex = -1
  heading.focus({ preventScroll: true })
}
watch(
  () => !!user.value,
  (ready) => {
    if (ready && route.hash) void focusSection(route.hash.slice(1))
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="pg-main lg flex flex-col"
    :class="[mobile ? 'gap-4 px-4 pt-4' : 'gap-6', dirty && !mobile ? 'pb-24' : '']"
  >
    <div v-if="!mobile" class="flex flex-col gap-1">
      <PTitle>{{ t('account.title') }}</PTitle>
      <p class="text-muted">{{ t('account.intro') }}</p>
    </div>

    <div v-if="!user" class="flex flex-col gap-6">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>

    <!-- Mobile -->
    <div v-else-if="mobile" class="flex flex-col gap-4">
      <ProfileCard
        id="datos"
        v-model:bio="profile.bio.value"
        v-model:location="profile.location.value"
        v-model:time-zone="profile.timeZone.value"
        v-model:password="profile.password.value"
        compact
        :password-error="profile.passwordError.value"
        :errors="profile.errors.value"
        :dirty="profile.count.value > 0"
        :timezones="timezones.data.value"
        :saving="updateProfile.isPending.value"
        @save="saveProfileMobile"
      />
      <NotificationsCard
        id="avisos"
        compact
        :matrix="draft"
        :channels="channels"
        @toggle="toggle"
      />
      <CommunityCard id="correo" :title="t('account.security.title')">
        <div class="flex flex-col gap-3">
          <PButton variant="outline" block size="lg" @click="sheet = 'email'">
            {{ t('account.security.emailTitle') }}
          </PButton>
          <PButton variant="outline" block size="lg" @click="sheet = 'password'">
            {{ t('account.security.changePassword') }}
          </PButton>
          <PButton
            variant="outline"
            block
            size="lg"
            :disabled="othersCount === 0"
            :loading="revokeOthers.isPending.value"
            @click="confirmOthers = true"
          >
            {{ t('account.sessions.closeOthersCount', { n: othersCount }) }}
          </PButton>
        </div>
      </CommunityCard>
      <TelegramCard
        id="telegram"
        block
        :linked="channels.telegram.linked"
        :username="tgUsername"
        :unlinking="unlink.isPending.value"
        @unlink="unlink.mutate()"
      />
      <BottomSheet
        :open="sheet === 'email'"
        :title="t('account.security.emailTitle')"
        @update:open="sheet = null"
      >
        <div class="pb-4"><EmailChangeForm @done="sheet = null" /></div>
      </BottomSheet>
      <BottomSheet
        :open="sheet === 'password'"
        :title="t('account.security.changePassword')"
        @update:open="sheet = null"
      >
        <div class="pb-4"><PasswordChangeForm @done="sheet = null" /></div>
      </BottomSheet>
      <PrognoModal
        v-model:open="confirmOthers"
        destructive
        :title="t('account.sessions.confirm.title')"
        :description="t('account.sessions.confirm.text')"
        :confirm-label="t('account.sessions.closeOthers')"
        @confirm="revokeOthers.mutate()"
      />
    </div>

    <!-- Desktop -->
    <div
      v-else
      class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 min-[901px]:grid-cols-[200px_minmax(0,1fr)]"
    >
      <nav :aria-label="t('account.toc')" class="min-[901px]:sticky min-[901px]:top-[72px]">
        <ul
          class="m-0 flex list-none gap-1 overflow-x-auto p-0 max-[900px]:pb-1 min-[901px]:flex-col min-[901px]:gap-0.5"
        >
          <li v-for="s in ACCOUNT_SECTIONS" :key="s">
            <RouterLink
              :to="{ hash: `#${s}` }"
              replace
              class="text-muted hover:bg-surface-muted hover:text-heading focus-visible:outline-focus-ring max-[900px]:bg-surface-muted inline-flex min-h-11 items-center rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap no-underline focus-visible:outline-2 focus-visible:outline-offset-2 min-[901px]:flex min-[901px]:min-h-9"
              @click="focusSection(s)"
            >
              {{ t(`account.sections.${s}`) }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div class="flex min-w-0 flex-col gap-6">
        <section id="datos" class="scroll-mt-20">
          <ProfileCard
            v-model:bio="profile.bio.value"
            v-model:location="profile.location.value"
            v-model:birthdate="profile.birthdate.value"
            v-model:time-zone="profile.timeZone.value"
            v-model:password="profile.password.value"
            :password-error="profile.passwordError.value"
            :errors="profile.errors.value"
            :username="user.username"
            :timezones="timezones.data.value"
          />
        </section>
        <section id="foto" class="scroll-mt-20">
          <PhotoCard
            :id="user.id"
            v-model:cropping="cropping"
            :name="user.username"
            :has-image="user.hasProfileImage"
            :version="photoVersion"
            :uploading="upload.isPending.value"
            :removing="removePhoto.isPending.value"
            @upload="onUpload"
            @remove="onRemovePhoto"
          />
        </section>
        <section id="correo" class="scroll-mt-20">
          <SecurityCard :email="user.email ?? undefined" />
        </section>
        <section id="sesiones" class="scroll-mt-20">
          <SessionsCard
            :tokens="tokens.data.value"
            :loading="tokens.isLoading.value"
            :error="tokens.error.value"
            :closing="revokeOthers.isPending.value"
            @close="revoke.mutate($event)"
            @close-others="revokeOthers.mutate()"
            @retry="tokens.refetch()"
          />
        </section>
        <section id="telegram" class="scroll-mt-20">
          <TelegramCard
            :linked="channels.telegram.linked"
            :username="tgUsername"
            :unlinking="unlink.isPending.value"
            @unlink="unlink.mutate()"
          />
        </section>
        <section id="avisos" class="scroll-mt-20">
          <NotificationsCard :matrix="draft" :channels="channels" @toggle="toggle" />
        </section>
        <PrognoAlert v-if="saved && !dirty" variant="ok" :title="t('account.saveBar.saved')" />
      </div>
    </div>

    <SaveBar
      v-if="!mobile && user"
      :count="count"
      :saving="saving"
      @save="saveAll"
      @discard="discard"
    />
    <ConfirmLeaveDialog :open="leave.open.value" @stay="leave.stay" @leave="leave.leave" />
  </div>
</template>
