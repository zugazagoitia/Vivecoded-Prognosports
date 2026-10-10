<script setup lang="ts">
import { useMutationObserver } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import AppLogo from '@/components/ui/AppLogo.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Menu, { type MenuEntry } from '@/components/ui/Menu.vue'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTooltip from '@/components/ui/PTooltip.vue'
import { focusRing } from '@/components/ui/styles'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { useThemeStore } from '@/stores/theme'
import { NAV_PATHS, useNavLinks } from './useNavLinks'

const { t } = useI18n()
const router = useRouter()
const session = useSessionStore()
const community = useCommunityStore()
const theme = useThemeStore()
const links = useNavLinks()

const homeTo = computed(() => (session.isAuthenticated ? NAV_PATHS.home : '/'))

// The effective theme (system mode included) lives on <html>.
const root = globalThis.document?.documentElement
const isDark = ref(root?.dataset.theme === 'dark')
if (root) {
  useMutationObserver(
    root,
    () => {
      isDark.value = root.dataset.theme === 'dark'
    },
    { attributes: true, attributeFilter: ['data-theme'] },
  )
}
function toggleTheme() {
  theme.set(isDark.value ? 'light' : 'dark')
}

const communityEntries = computed<MenuEntry[]>(() => [
  { type: 'label', label: t('nav.community.yours') },
  ...community.communities.map((c) => ({
    value: `c:${c.id}`,
    label: c.name,
    active: c.id === community.activeId,
    hint: c.id === community.activeId ? t('nav.community.active') : undefined,
  })),
  { type: 'separator' },
  { value: 'all', label: t('nav.community.all') },
  { value: 'create', label: t('nav.community.create') },
])

/** Picking a community never navigates: it switches the active one and its data reloads. */
function onCommunity(value: string) {
  if (value === 'all') void router.push(NAV_PATHS.communities)
  else if (value === 'create') void router.push(NAV_PATHS.createCommunity)
  else if (value.startsWith('c:')) community.select(Number(value.slice(2)))
}

const userEntries = computed<MenuEntry[]>(() => [
  { type: 'separator' },
  { value: 'profile', label: t('nav.profile'), icon: 'user' },
  { value: 'settings', label: t('nav.user.settings'), icon: 'gear' },
  { value: 'notifications', label: t('nav.user.notifications'), icon: 'bell' },
  { type: 'separator' },
  { value: 'logout', label: t('nav.user.logout'), icon: 'right-from-bracket' },
])

const username = computed(() => session.user?.username ?? '')

async function onUser(value: string) {
  if (value === 'profile') await router.push(`/u/${encodeURIComponent(username.value)}`)
  else if (value === 'settings') await router.push(NAV_PATHS.settings)
  else if (value === 'notifications')
    await router.push({ path: NAV_PATHS.settings, hash: '#avisos' })
  else if (value === 'logout') {
    await session.logout()
    await router.push('/sesion-cerrada')
  }
}

const linkClass = [
  'text-body hover:bg-surface-muted hover:text-heading inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium no-underline',
  'aria-[current=page]:bg-tint aria-[current=page]:text-tint-fg',
  focusRing,
]
</script>

<template>
  <!-- Signed-in phones use MobileBar + TabBar (N2); visitors keep this header. -->
  <header
    class="bg-surface border-border sticky top-0 z-40 border-b"
    :class="{ 'max-[899px]:hidden': session.isAuthenticated }"
  >
    <div
      class="mx-auto flex min-h-14 w-full max-w-(--container-xl) items-center gap-1 px-4 sm:px-6"
    >
      <RouterLink
        :to="homeTo"
        :aria-label="t('nav.home')"
        :class="[
          'text-heading mr-2 inline-flex min-h-11 items-center rounded-md no-underline',
          'max-[1099px]:[&_.app-logo-word]:hidden',
          focusRing,
        ]"
      >
        <AppLogo :size="28" />
      </RouterLink>

      <nav :aria-label="t('nav.main')" class="hidden min-[900px]:flex min-[900px]:gap-0.5">
        <RouterLink
          v-for="l in links"
          :key="l.key"
          :to="l.to"
          :aria-current="l.active ? 'page' : undefined"
          :class="linkClass"
        >
          {{ t(l.label) }}
        </RouterLink>
      </nav>

      <span class="flex-1" />

      <template v-if="!session.isAuthenticated">
        <PTooltip :content="t('nav.theme')">
          <PButton
            variant="ghost"
            size="sm"
            icon-only
            :icon="isDark ? 'sun' : 'moon'"
            :aria-label="t('nav.theme')"
            :aria-pressed="isDark"
            @click="toggleTheme"
          >
          </PButton>
        </PTooltip>
        <PButton variant="ghost" size="sm" to="/login">{{ t('nav.login') }}</PButton>
        <PButton variant="primary" size="sm" to="/registro">{{ t('nav.register') }}</PButton>
      </template>

      <template v-else>
        <Menu :entries="communityEntries" align="end" @select="onCommunity">
          <template #trigger>
            <PButton
              variant="outline"
              size="sm"
              icon="users"
              :aria-label="t('nav.community.switch')"
              class="max-w-[130px] max-[899px]:hidden min-[1100px]:max-w-[220px]"
            >
              <span class="truncate">{{ community.active?.name ?? t('nav.community.none') }}</span>
              <PIcon name="chevron-down" :size="16" />
            </PButton>
          </template>
        </Menu>

        <PTooltip :content="t('nav.notifications')">
          <PButton
            variant="ghost"
            size="sm"
            icon-only
            icon="bell"
            :aria-label="t('nav.notifications')"
            :to="{ path: NAV_PATHS.settings, hash: '#avisos' }"
          >
          </PButton>
        </PTooltip>

        <PTooltip :content="t('nav.theme')">
          <PButton
            variant="ghost"
            size="sm"
            icon-only
            :icon="isDark ? 'sun' : 'moon'"
            :aria-label="t('nav.theme')"
            :aria-pressed="isDark"
            @click="toggleTheme"
          >
          </PButton>
        </PTooltip>

        <Menu :entries="userEntries" align="end" @select="onUser">
          <template #header>
            <div role="presentation" class="flex items-center gap-2.5 px-2.5 py-2">
              <span aria-hidden="true"><Avatar :name="username" :size="40" you /></span>
              <div class="min-w-0">
                <p class="text-heading m-0 truncate text-sm font-semibold">{{ username }}</p>
                <p class="text-muted m-0 truncate text-xs">{{ session.user?.email }}</p>
              </div>
            </div>
          </template>
          <template #trigger>
            <button
              type="button"
              :aria-label="t('nav.profile')"
              :class="[
                'ml-1 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full',
                focusRing,
              ]"
            >
              <Avatar :name="username" :size="32" you />
            </button>
          </template>
        </Menu>
      </template>
    </div>
  </header>
</template>
