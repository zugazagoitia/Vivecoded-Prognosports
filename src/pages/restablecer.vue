<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AuthBadge from '@/components/auth/AuthBadge.vue'
import CodeInput from '@/components/auth/CodeInput.vue'
import ResetPasswordMeter from '@/components/auth/ResetPasswordMeter.vue'
import {
  LOCK_SECONDS,
  MAX_ATTEMPTS,
  normalizeCode,
  requestCodeLocation,
  resetSchema,
  submitReset,
} from '@/components/auth/reset'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useNow } from '@/composables/useNow'
import { useToast } from '@/composables/useToast'
import { emailSchema, normalizeEmail } from '@/lib/auth-schemas'
import { toTypedSchema } from '@/lib/zod-form'
import { z } from 'zod'

definePage({
  meta: {
    layout: 'landing',
    title: 'route.reset',
    guards: ['home'],
    noFooter: true,
  },
})

const { t } = useI18n()
const route = useRoute()
const toast = useToast()

const q = (v: unknown) => (typeof v === 'string' ? v : '')
const initialEmail = normalizeEmail(q(route.query.email))
// The address is only editable when it did not arrive (or is not valid) in the query.
const askEmail = !emailSchema({ required: '', invalid: 'x' }).safeParse(initialEmail).success

const schema = z.intersection(
  z.object({
    email: emailSchema({
      required: t('recover.email.required'),
      invalid: t('recover.email.invalid'),
    }),
  }),
  resetSchema({
    code: t('reset.error.codeRequired'),
    passwordRequired: t('reset.error.passwordRequired'),
    passwordShort: t('reset.error.passwordShort'),
    repeatRequired: t('reset.error.repeatRequired'),
    mismatch: t('reset.error.mismatch'),
  }),
)

const { defineField, errors, handleSubmit, setFieldError } = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: {
    email: initialEmail,
    code: normalizeCode(q(route.query.code)),
    password: '',
    repeat: '',
  },
})
const [email] = defineField('email')
const [code] = defineField('code')
const [password] = defineField('password')
const [repeat] = defineField('repeat')

const sending = ref(false)
const done = ref(false)
const codeFailed = ref(false)
const attempts = ref(0)
const lockedUntil = ref(0)
const now = useNow(1000)
const remaining = computed(() => Math.max(0, Math.ceil((lockedUntil.value - now.value) / 1000)))
const locked = computed(() => remaining.value > 0)

const formEl = useTemplateRef<HTMLFormElement>('formEl')
const codeEl = useTemplateRef<InstanceType<typeof CodeInput>>('codeEl')
const doneHeading = useTemplateRef<HTMLElement>('doneHeading')

async function focusFirstError() {
  await nextTick()
  formEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

const submit = handleSubmit(
  async (values) => {
    if (sending.value || locked.value) return
    sending.value = true
    codeFailed.value = false
    try {
      const outcome = await submitReset({
        email: values.email,
        code: values.code,
        password: values.password,
      })
      if (outcome === 'ok') {
        done.value = true
        await nextTick()
        doneHeading.value?.focus()
      } else if (outcome === 'code') {
        attempts.value += 1
        if (attempts.value >= MAX_ATTEMPTS) {
          attempts.value = 0
          lockedUntil.value = Date.now() + LOCK_SECONDS * 1000
        }
        codeFailed.value = true
        await nextTick()
        codeEl.value?.focus()
      } else if (outcome === 'password') {
        setFieldError('password', t('reset.error.passwordRejected'))
        await focusFirstError()
      } else {
        toast.error(t('reset.error.title'), t('reset.error.description'))
      }
    } finally {
      sending.value = false
    }
  },
  () => void focusFirstError(),
)
</script>

<template>
  <div class="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12 sm:py-20">
    <PCard v-if="!done" tag="div">
      <form ref="formEl" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
        <AuthBadge icon="lock" />
        <div class="flex flex-col gap-1">
          <PTitle level="subtitle" as="h1">{{ t('reset.title') }}</PTitle>
          <p v-if="!askEmail" class="text-muted text-sm">
            {{ t('reset.introCode') }}<b class="text-heading break-words">{{ initialEmail }}</b
            >.
          </p>
          <p v-else class="text-muted text-sm">{{ t('reset.introEmail') }}</p>
        </div>
        <PInput
          v-if="askEmail"
          v-model="email"
          type="email"
          icon="envelope"
          autocomplete="email"
          inputmode="email"
          autocapitalize="off"
          spellcheck="false"
          :label="t('reset.emailLabel')"
          :placeholder="t('reset.emailPlaceholder')"
          :error="errors.email"
        />
        <CodeInput
          ref="codeEl"
          v-model="code"
          :label="t('reset.codeLabel')"
          :help="t('reset.codeHelp')"
          :error="errors.code"
        />
        <PrognoAlert v-if="locked" variant="err" :title="t('reset.error.tooMany')">
          {{ t('reset.error.tooManyDescription') }}
        </PrognoAlert>
        <PrognoAlert v-else-if="codeFailed" variant="err" :title="t('reset.error.code')">
          {{ t('reset.error.codeDescription') }}
        </PrognoAlert>
        <PInput
          v-model="password"
          type="password"
          icon="lock"
          autocomplete="new-password"
          :label="t('reset.passwordLabel')"
          :help="t('reset.passwordHelp')"
          :error="errors.password"
        />
        <ResetPasswordMeter :password="password ?? ''" />
        <PInput
          v-model="repeat"
          type="password"
          icon="lock"
          autocomplete="new-password"
          :label="t('reset.repeatLabel')"
          :error="errors.repeat"
        />
        <PButton type="submit" size="lg" block :loading="sending" :disabled="locked">
          {{ locked ? t('reset.locked', { n: remaining }) : t('reset.submit') }}
        </PButton>
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span class="text-muted">{{ t('reset.expired') }}</span>
          <PButton :to="requestCodeLocation(email ?? '')" variant="ghost" size="sm">
            {{ t('reset.again') }}
          </PButton>
        </div>
      </form>
    </PCard>
    <PCard v-else tag="div">
      <div class="flex flex-col gap-5">
        <AuthBadge icon="circle-check" tone="ok" />
        <div class="flex flex-col gap-1">
          <h1 ref="doneHeading" tabindex="-1" class="t-subtitle text-heading focus:outline-none">
            {{ t('reset.done.title') }}
          </h1>
          <p class="text-muted text-sm">{{ t('reset.done.text') }}</p>
        </div>
        <PButton to="/login" size="lg" block>{{ t('reset.done.login') }}</PButton>
      </div>
    </PCard>
  </div>
</template>
