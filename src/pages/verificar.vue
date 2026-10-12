<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AuthBadge from '@/components/auth/AuthBadge.vue'
import CodeInput from '@/components/auth/CodeInput.vue'
import { CODE_LENGTH, normalizeCode } from '@/components/auth/reset'
import {
  RESEND_SECONDS,
  afterVerifyDestination,
  formatCountdown,
  resendCode,
  submitVerify,
  useCountdown,
} from '@/components/auth/verify'
import VerifySteps from '@/components/auth/VerifySteps.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import { useToast } from '@/composables/useToast'
import { useMe } from '@/queries/resources'
import { keys } from '@/queries/keys'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: {
    layout: 'landing',
    title: 'route.verify',
    // `auth`: without a session -> /login?redirect=/verificar. Verified users leave below.
    guards: ['auth'],
    noFooter: true,
  },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const queryClient = useQueryClient()
const session = useSessionStore()
const community = useCommunityStore()

// Already verified on arrival: nothing to do here.
if (session.user?.verified) void router.replace('/home')

// Registration (A2) leaves the address in the history state: it just sent the first code.
const stateEmail = (() => {
  const s: unknown = globalThis.history?.state
  const e = (s as { email?: unknown } | null)?.email
  return typeof e === 'string' ? e : ''
})()
const justRegistered = stateEmail !== ''

const me = useMe()
const email = computed(() => me.data.value?.email || session.user?.email || stateEmail || '')
const loadingEmail = computed(() => !email.value && (me.isPending.value || me.isFetching.value))

const code = ref('')
const codeError = ref('')
const failed = ref(false)
const sending = ref(false)
const resending = ref(false)
const done = ref(false)

// The first code was sent at registration: wait before offering another. Entering any other way
// (no registration mark) offers the resend straight away.
const countdown = useCountdown(justRegistered ? RESEND_SECONDS : 0)
const canResend = computed(() => countdown.finished.value && !resending.value)
// Polite live region: announces only when the countdown ends, never every second.
const readyMessage = ref('')
watch(countdown.finished, (finished) => {
  readyMessage.value = finished ? t('verify.resendReady') : ''
})

const codeEl = useTemplateRef<InstanceType<typeof CodeInput>>('codeEl')
const doneHeading = useTemplateRef<HTMLElement>('doneHeading')

async function onSubmit() {
  if (sending.value) return
  failed.value = false
  const value = normalizeCode(code.value)
  if (value.length < CODE_LENGTH) {
    codeError.value = t('verify.codeRequired')
    codeEl.value?.focus()
    return
  }
  codeError.value = ''
  sending.value = true
  try {
    const outcome = await submitVerify(value)
    if (outcome === 'ok') {
      await queryClient.invalidateQueries({ queryKey: keys.me() })
      await session.refreshUser().catch(() => undefined)
      const target = afterVerifyDestination(route.query.redirect, community.hasCommunity)
      if (target) {
        await router.replace(target)
        return
      }
      done.value = true
      await nextTick()
      doneHeading.value?.focus()
    } else if (outcome === 'code') {
      failed.value = true
      await nextTick()
      codeEl.value?.focus()
    } else {
      toast.error(t('verify.error.failed'), t('verify.error.retry'))
    }
  } finally {
    sending.value = false
  }
}

async function onResend() {
  if (!canResend.value) return
  resending.value = true
  try {
    if (await resendCode()) {
      countdown.restart()
      toast.success(
        email.value ? t('verify.resent', { email: email.value }) : t('verify.resentFallback'),
      )
    } else {
      toast.error(t('verify.error.resendFailed'), t('verify.error.retry'))
    }
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-4 py-12 sm:py-20">
    <VerifySteps :verified="done" />
    <PCard v-if="!done" tag="div">
      <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
        <AuthBadge icon="envelope" />
        <div class="flex flex-col gap-1">
          <h1 class="t-subtitle text-heading">{{ t('verify.title') }}</h1>
          <div
            v-if="loadingEmail"
            role="status"
            class="bg-surface-muted h-5 w-full rounded-sm motion-safe:animate-pulse"
          >
            <span class="sr-only">{{ t('verify.emailLoading') }}</span>
          </div>
          <p v-else class="text-muted text-sm">
            {{ t('verify.intro') }}<b v-if="email" class="text-heading break-words">{{ email }}</b
            >{{ t('verify.introEnd') }}
          </p>
        </div>
        <PrognoAlert v-if="failed" variant="err" :title="t('verify.error.code')">
          {{ t('verify.error.codeDescription') }}
        </PrognoAlert>
        <CodeInput
          ref="codeEl"
          v-model="code"
          :label="t('verify.codeLabel')"
          :help="t('verify.codeHelp')"
          :error="codeError"
        />
        <PButton type="submit" size="lg" block :loading="sending">
          {{ t('verify.submit') }}
        </PButton>
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span class="text-muted">{{ t('verify.notArrived') }}</span>
          <PButton
            variant="ghost"
            size="sm"
            :disabled="!canResend"
            :loading="resending"
            @click="onResend"
          >
            {{
              countdown.finished.value
                ? t('verify.resend')
                : t('verify.resendWait', { time: formatCountdown(countdown.remaining.value) })
            }}
          </PButton>
        </div>
        <p class="sr-only" aria-live="polite">{{ readyMessage }}</p>
      </form>
    </PCard>
    <PCard v-else tag="div">
      <div class="flex flex-col gap-5">
        <AuthBadge icon="envelope-circle-check" tone="ok" />
        <div class="flex flex-col gap-1">
          <h1 ref="doneHeading" tabindex="-1" class="t-subtitle text-heading focus:outline-none">
            {{ t('verify.done.title') }}
          </h1>
          <p class="text-muted text-sm">{{ t('verify.done.text') }}</p>
        </div>
        <PButton to="/comunidades" size="lg" block>{{ t('verify.done.choose') }}</PButton>
        <PButton to="/comunidades/crear" variant="outline" size="lg" block>
          {{ t('verify.done.create') }}
        </PButton>
      </div>
    </PCard>
  </div>
</template>
