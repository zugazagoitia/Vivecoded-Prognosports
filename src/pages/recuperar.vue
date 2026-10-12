<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import AuthBadge from '@/components/auth/AuthBadge.vue'
import {
  CODE_TTL_MINUTES,
  RESEND_COOLDOWN_S,
  requestResetCode,
  resetPasswordLocation,
} from '@/components/auth/forgot'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PInput from '@/components/ui/PInput.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { useNow } from '@/composables/useNow'
import { useToast } from '@/composables/useToast'
import { emailSchema, normalizeEmail } from '@/lib/auth-schemas'
import { toTypedSchema } from '@/lib/zod-form'

definePage({
  meta: {
    layout: 'landing',
    title: 'route.recover',
    guards: ['home'],
    noFooter: true,
  },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const { defineField, errors, handleSubmit } = useForm({
  validationSchema: toTypedSchema(
    z.object({
      email: emailSchema({
        required: t('recover.email.required'),
        invalid: t('recover.email.invalid'),
      }),
    }),
  ),
  initialValues: { email: typeof route.query.email === 'string' ? route.query.email : '' },
})
const [email] = defineField('email')

const sent = ref(false)
const sending = ref(false)
/** Normalised address of the last successful request, shown in step 2. */
const sentTo = ref('')
const cooldownUntil = ref(0)
const now = useNow(1000)
const remaining = computed(() => Math.max(0, Math.ceil((cooldownUntil.value - now.value) / 1000)))
// The wait only applies to the address that already got a code.
const waiting = computed(
  () => remaining.value > 0 && normalizeEmail(email.value ?? '') === sentTo.value,
)

const formEl = useTemplateRef<HTMLFormElement>('formEl')
const heading = useTemplateRef<HTMLElement>('sentHeading')

const submit = handleSubmit(async (values) => {
  if (sending.value || waiting.value) return
  sending.value = true
  try {
    const outcome = await requestResetCode(values.email)
    if (outcome === 'error') {
      toast.error(t('recover.error.title'), t('recover.error.description'))
      return
    }
    sentTo.value = values.email
    email.value = values.email
    cooldownUntil.value = Date.now() + RESEND_COOLDOWN_S * 1000
    sent.value = true
    await nextTick()
    heading.value?.focus()
  } finally {
    sending.value = false
  }
})

async function changeEmail() {
  sent.value = false
  await nextTick()
  formEl.value?.querySelector('input')?.focus()
}

function haveCode() {
  void router.push(resetPasswordLocation(sentTo.value))
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12 sm:py-20">
    <PCard v-if="!sent" tag="div">
      <form ref="formEl" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
        <AuthBadge icon="unlock-keyhole" />
        <div class="flex flex-col gap-1">
          <PTitle level="subtitle" as="h1">{{ t('recover.request.title') }}</PTitle>
          <p class="text-muted text-sm">{{ t('recover.request.intro') }}</p>
        </div>
        <PInput
          v-model="email"
          type="email"
          icon="envelope"
          autocomplete="email"
          inputmode="email"
          autocapitalize="off"
          spellcheck="false"
          :label="t('recover.request.emailLabel')"
          :placeholder="t('recover.request.emailPlaceholder')"
          :error="errors.email"
        />
        <PButton type="submit" size="lg" block :loading="sending" :disabled="waiting">
          {{ waiting ? t('recover.request.wait', { n: remaining }) : t('recover.request.send') }}
        </PButton>
        <PButton to="/login" variant="ghost" size="lg" icon="arrow-left" block>
          {{ t('recover.request.back') }}
        </PButton>
      </form>
    </PCard>
    <PCard v-else tag="div">
      <div class="flex flex-col gap-5">
        <AuthBadge icon="envelope-circle-check" tone="ok" />
        <div class="flex flex-col gap-1">
          <h1 ref="sentHeading" tabindex="-1" class="t-subtitle text-heading focus:outline-none">
            {{ t('recover.sent.title') }}
          </h1>
          <p class="text-muted text-sm">
            {{ t('recover.sent.before') }}<b class="text-heading break-all">{{ sentTo }}</b
            >{{ t('recover.sent.after', { minutes: CODE_TTL_MINUTES }) }}
          </p>
        </div>
        <PButton size="lg" block @click="haveCode">{{ t('recover.sent.haveCode') }}</PButton>
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span class="text-muted">{{ t('recover.sent.spam') }}</span>
          <PButton variant="ghost" size="sm" @click="changeEmail">
            {{ t('recover.sent.change') }}
          </PButton>
        </div>
      </div>
    </PCard>
  </div>
</template>
