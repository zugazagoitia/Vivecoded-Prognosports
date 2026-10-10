<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { useForm } from 'vee-validate'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { gpsApi } from '@/api'
import heroImage from '@/assets/landing/hero.svg'
import AuthShell from '@/components/auth/AuthShell.vue'
import {
  closingIn,
  gpFromRedirect,
  loginSchema,
  mapLoginError,
  postLoginTarget,
  returnNotice,
  type LoginValues,
} from '@/components/auth/login'
import PasswordField from '@/components/auth/PasswordField.vue'
import { useSeasonYear } from '@/components/landing/useSeasonYear'
import AppImage from '@/components/ui/AppImage.vue'
import AppLogo from '@/components/ui/AppLogo.vue'
import PButton from '@/components/ui/PButton.vue'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import PField from '@/components/ui/PField.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import { controlBase, focusRing } from '@/components/ui/styles'
import { useToast } from '@/composables/useToast'
import { SEASON_COMPETITION } from '@/content/landing-demo'
import { toTypedSchema } from '@/lib/zod-form'
import { sanitizeRedirect } from '@/router/guards'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: {
    layout: 'empty',
    title: 'route.login',
  },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const toast = useToast()

// §2.8: set by the router when the token expired.
const expired = computed(() => route.query.expired === '1')
const redirect = computed(() => sanitizeRedirect(route.query.redirect))
const registerTo = computed(() =>
  redirect.value ? { path: '/registro', query: { redirect: redirect.value } } : '/registro',
)

// Already signed in: straight to the return route (or /home).
if (session.isAuthenticated) {
  void router.replace(postLoginTarget(session.user ?? { verified: true }, redirect.value))
}

// Public next GP: side panel and the GP name of the return notice (no token needed).
const nextGp = useQuery({
  queryKey: ['gps', 'next', SEASON_COMPETITION],
  queryFn: ({ signal }) => gpsApi.getNextGp(SEASON_COMPETITION, signal),
  retry: false,
  staleTime: 5 * 60 * 1000,
})
const year = useSeasonYear()

const returnedGpName = computed(() => {
  const target = gpFromRedirect(redirect.value)
  const gp = nextGp.data.value
  if (!target || !gp) return null
  const wanted = target.gp.toLowerCase()
  return String(gp.id) === wanted || gp.code?.toLowerCase() === wanted ? gp.name : null
})
const notice = computed(() => returnNotice(t, redirect.value, returnedGpName.value))

const panelTitle = computed(() => {
  const gp = nextGp.data.value
  const first = gp?.sessions
    ?.map((s) => (s.date ? Date.parse(s.date) : Number.NaN))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)[0]
  // Predictions close 5 minutes before the first session.
  const when = first === undefined ? null : closingIn(t, first - 5 * 60_000)
  return gp && when
    ? t('auth.login.panel.closes', { name: gp.name, when })
    : t('auth.login.panel.fallback')
})

// Form
const { errors, defineField, handleSubmit } = useForm<LoginValues>({
  validationSchema: toTypedSchema(loginSchema(t)),
  initialValues: { email: '', password: '', remember: true },
})
const [email, emailAttrs] = defineField('email', { validateOnModelUpdate: false })
const [password] = defineField('password', { validateOnModelUpdate: false })
const [remember] = defineField('remember')

const form = useTemplateRef<HTMLFormElement>('form')
const passwordField = useTemplateRef<InstanceType<typeof PasswordField>>('passwordField')
const submitting = ref(false)
const failed = ref(false)
const ALERT_ID = 'login-error'

async function focusFirstError() {
  await nextTick()
  form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

const onSubmit = handleSubmit(
  async (values) => {
    if (submitting.value) return
    submitting.value = true
    failed.value = false
    try {
      await session.login(values.email.trim(), values.password, values.remember)
      // `/user/me` rejected the fresh token: the store already dropped it.
      if (!session.user) throw new Error(t('auth.login.error.text'))
      await router.replace(postLoginTarget(session.user, redirect.value))
    } catch (e) {
      submitting.value = false
      const failure = mapLoginError(e)
      if (failure.kind === 'credentials') {
        failed.value = true
        await nextTick()
        passwordField.value?.focus()
      } else {
        toast.error(t('auth.login.failed'), failure.message || undefined)
      }
    }
  },
  () => void focusFirstError(),
)
</script>

<template>
  <AuthShell back-to="/">
    <div
      class="sm:bg-surface sm:ring-card-ring flex w-full flex-col sm:mx-auto sm:max-w-md sm:rounded-lg sm:shadow-(--card-shadow) sm:ring-1"
    >
      <form
        ref="form"
        novalidate
        class="flex flex-col gap-5 sm:p-6"
        :aria-busy="submitting || undefined"
        @submit.prevent="onSubmit"
      >
        <header class="flex flex-col gap-2 sm:gap-1">
          <div class="sm:hidden"><AppLogo :size="48" :wordmark="false" /></div>
          <h1 class="t-subtitle text-heading">{{ t('auth.login.title') }}</h1>
          <p class="text-muted text-sm">{{ t('auth.login.subtitle') }}</p>
        </header>

        <PrognoAlert v-if="expired" variant="warn" :title="t('auth.login.expired')">
          {{ t('auth.login.expiredText') }}
        </PrognoAlert>
        <PrognoAlert v-else-if="notice && !failed" variant="info" :title="notice">
          <span class="max-sm:hidden">{{ t('auth.login.notice.back') }}</span>
        </PrognoAlert>
        <PrognoAlert
          v-if="failed"
          :id="ALERT_ID"
          variant="err"
          :title="t('auth.login.error.title')"
        >
          {{ t('auth.login.error.text') }}
        </PrognoAlert>

        <PField
          v-slot="{ id, describedby, invalid }"
          :label="t('auth.email.label')"
          :error="errors.email"
        >
          <div class="relative">
            <span
              class="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 max-sm:hidden"
            >
              <PIcon name="envelope" :size="16" />
            </span>
            <input
              v-bind="emailAttrs"
              :id="id"
              v-model="email"
              type="email"
              name="username"
              autocomplete="username"
              inputmode="email"
              autocapitalize="none"
              spellcheck="false"
              :placeholder="t('auth.email.placeholder')"
              :aria-invalid="invalid || undefined"
              :aria-describedby="
                [describedby, failed ? ALERT_ID : undefined].filter(Boolean).join(' ') || undefined
              "
              :class="[controlBase, 'max-sm:min-h-12! sm:pl-9']"
            />
          </div>
        </PField>

        <PasswordField
          ref="passwordField"
          v-model="password"
          name="password"
          autocomplete="current-password"
          phone-bare
          :error="errors.password"
          :describedby="failed ? ALERT_ID : undefined"
        >
          <template #label-aside>
            <RouterLink
              to="/recuperar"
              :class="[
                'text-brand-700 dark:text-brand-300 -my-3.5 inline-flex min-h-11 items-center rounded-sm text-xs underline',
                focusRing,
              ]"
            >
              {{ t('auth.login.forgot') }}
            </RouterLink>
          </template>
        </PasswordField>

        <div class="max-sm:hidden">
          <PCheckbox v-model="remember" :label="t('auth.login.remember')" />
        </div>

        <PButton type="submit" size="lg" block :loading="submitting">
          {{ t('auth.login.submit') }}
        </PButton>
      </form>

      <p
        class="text-muted sm:border-border mt-6 text-center text-sm sm:mt-0 sm:border-t sm:px-6 sm:py-3"
      >
        {{ t('auth.login.noAccount') }}
        <RouterLink
          :to="registerTo"
          :class="[
            'text-brand-700 dark:text-brand-300 inline-flex min-h-11 items-center rounded-sm font-bold underline',
            focusRing,
          ]"
        >
          {{ t('auth.login.register') }}
        </RouterLink>
      </p>
    </div>

    <template #aside>
      <div
        class="relative isolate flex h-full min-h-[560px] flex-col justify-end gap-3 overflow-hidden rounded-lg p-8"
      >
        <AppImage
          :src="heroImage"
          alt=""
          :width="1600"
          :height="900"
          aria-hidden="true"
          class="absolute inset-0 -z-20 size-full object-cover"
        />
        <div
          aria-hidden="true"
          class="from-brand-900/35 to-brand-900/92 absolute inset-0 -z-10 bg-linear-to-b"
        />
        <p class="text-brand-200 text-xs font-bold tracking-wide uppercase">
          {{ t('auth.login.panel.season', { year }) }}
        </p>
        <h2 class="text-[30px] leading-[38px] font-semibold text-balance text-white">
          {{ panelTitle }}
        </h2>
        <p class="text-brand-100">{{ t('auth.login.panel.friends') }}</p>
      </div>
    </template>
  </AuthShell>
</template>
