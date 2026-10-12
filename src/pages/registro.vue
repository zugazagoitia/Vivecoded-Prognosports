<script setup lang="ts">
import { useField, useForm } from 'vee-validate'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { authApi, ApiError } from '@/api'
import PasswordMeter from '@/components/auth/PasswordMeter.vue'
import { isEmailInvalid, registerSchema } from '@/components/auth/registerSchema'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import PInput from '@/components/ui/PInput.vue'
import { focusRing } from '@/components/ui/styles'
import { useToast } from '@/composables/useToast'
import { toTypedSchema } from '@/lib/zod-form'
import { sanitizeRedirect } from '@/router/guards'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: {
    layout: 'landing',
    noFooter: true,
    title: 'route.register',
    guards: ['home'],
  },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const toast = useToast()

const redirect = computed(() => sanitizeRedirect(route.query.redirect))
const loginTo = computed(() => ({
  path: '/login',
  query: redirect.value ? { redirect: redirect.value } : {},
}))

const { handleSubmit, setFieldError, submitCount } = useForm({
  validationSchema: toTypedSchema(registerSchema),
  initialValues: { username: '', email: '', password: '', terms: false },
})
const username = useField<string>('username')
const email = useField<string>('email')
const password = useField<string>('password')
const terms = useField<boolean>('terms')

/** Errors show after the field was left or a submit was tried; the email also checks live. */
const shown = (f: { meta: { touched: boolean }; errorMessage: { value?: string } }) =>
  f.meta.touched || submitCount.value > 0 ? f.errorMessage.value : undefined
const usernameError = computed(() => shown(username))
const emailError = computed(() =>
  isEmailInvalid(email.value.value) ? t('register.email.invalid') : shown(email),
)
const passwordError = computed(() => shown(password))
const termsError = computed(() => (submitCount.value > 0 ? terms.errorMessage.value : undefined))

const formEl = useTemplateRef<HTMLFormElement>('formEl')
async function focusFirstError() {
  await nextTick()
  formEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

const submitting = ref(false)

/** Backend 400/409: «username in use» (documented) or a duplicated email. */
function applyServerError(e: ApiError): boolean {
  if (e.status !== 400 && e.status !== 409) return false
  if (/correo|e-?mail/i.test(e.message)) setFieldError('email', t('register.email.taken'))
  else setFieldError('username', t('register.username.taken'))
  return true
}

const onSubmit = handleSubmit(
  async (values) => {
    if (submitting.value) return
    submitting.value = true
    try {
      await authApi.register({
        username: values.username,
        email: values.email,
        password: values.password,
      })
      // The register response is not a documented session token: sign in with the same
      // credentials so that /verificar (auth guard) can run.
      await session.login(values.username, values.password)
      await router.push({
        path: '/verificar',
        query: redirect.value ? { redirect: redirect.value } : {},
        state: { email: values.email },
      })
    } catch (e) {
      if (e instanceof ApiError && applyServerError(e)) await focusFirstError()
      else toast.error(t('register.failed'), e instanceof ApiError ? e.message : undefined)
    } finally {
      submitting.value = false
    }
  },
  () => void focusFirstError(),
)

const link = ['text-link font-semibold underline underline-offset-2 rounded-xs', focusRing]
</script>

<template>
  <div class="pg-main lg:max-w-(--container-xl)">
    <div class="grid2 items-stretch gap-8">
      <div class="flex flex-col justify-center">
        <PCard class="mx-auto w-full max-w-md">
          <form
            ref="formEl"
            class="flex flex-col gap-5"
            novalidate
            :aria-busy="submitting || undefined"
            @submit.prevent="onSubmit"
          >
            <header class="flex flex-col gap-1">
              <h1 class="t-subtitle text-heading">{{ t('register.title') }}</h1>
              <p class="text-muted text-sm">{{ t('register.subtitle') }}</p>
            </header>

            <PInput
              v-model="username.value.value"
              :label="t('register.username.label')"
              :help="t('register.username.help')"
              :error="usernameError"
              :placeholder="t('register.username.placeholder')"
              icon="at"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              @blur="username.handleBlur"
            />
            <PInput
              v-model="email.value.value"
              type="email"
              :label="t('register.email.label')"
              :error="emailError"
              :placeholder="t('register.email.placeholder')"
              icon="envelope"
              autocomplete="email"
              inputmode="email"
              @blur="email.handleBlur"
            />
            <div class="flex flex-col gap-2">
              <PInput
                v-model="password.value.value"
                type="password"
                :label="t('register.password.label')"
                :error="passwordError"
                :placeholder="t('register.password.placeholder')"
                icon="lock"
                autocomplete="new-password"
                @blur="password.handleBlur"
              />
              <PasswordMeter :password="password.value.value" />
            </div>

            <PCheckbox v-model="terms.value.value" :error="termsError">
              {{ t('register.terms.before') }}
              <RouterLink
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                :class="link"
                :aria-label="`${t('register.terms.termsLink')} ${t('register.terms.newTab')}`"
                >{{ t('register.terms.termsLink') }}</RouterLink
              >
              {{ t('register.terms.and') }}
              <RouterLink
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                :class="link"
                :aria-label="`${t('register.terms.privacyLink')} ${t('register.terms.newTab')}`"
                >{{ t('register.terms.privacyLink') }}</RouterLink
              >
            </PCheckbox>

            <PButton type="submit" size="lg" block :loading="submitting">
              {{ t('register.submit') }}
            </PButton>

            <p class="text-body text-center text-sm">
              {{ t('register.haveAccount') }}
              <RouterLink :to="loginTo" :class="link">{{ t('register.login') }}</RouterLink>
            </p>
          </form>
        </PCard>
      </div>

      <aside
        class="from-brand-700 to-brand-900 flex min-h-[560px] flex-col justify-end gap-4 rounded-lg bg-linear-to-b p-8 max-[640px]:hidden"
      >
        <h2 class="t-up text-brand-200">{{ t('register.next.title') }}</h2>
        <ol class="m-0 flex list-none flex-col gap-3 p-0">
          <li v-for="n in 3" :key="n" class="flex items-start gap-3">
            <span
              aria-hidden="true"
              class="inline-flex size-7 flex-none items-center justify-center rounded-full bg-white/18 text-sm font-bold text-white"
              >{{ n }}</span
            >
            <span class="text-brand-100 pt-0.5 text-sm leading-5">{{
              t(`register.next.step${n}`)
            }}</span>
          </li>
        </ol>
      </aside>
    </div>
  </div>
</template>
