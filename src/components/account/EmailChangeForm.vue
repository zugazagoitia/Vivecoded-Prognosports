<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import { messageFor } from '@/api/messages'
import PButton from '@/components/ui/PButton.vue'
import PInput from '@/components/ui/PInput.vue'
import { emailChangeSchema } from '@/lib/account'
import { toTypedSchema } from '@/lib/zod-form'
import { useChangeEmail } from '@/queries/account'

/**
 * Form to change the e-mail (U3): new address + current password (the API asks for it).
 * Emits `done` after a successful change. Lives in a modal (desktop) or a sheet (mobile).
 */
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()
const change = useChangeEmail()

const { defineField, errors, handleSubmit, setFieldError } = useForm({
  validationSchema: toTypedSchema(
    emailChangeSchema({
      required: t('account.security.errors.emailRequired'),
      invalid: t('account.security.errors.emailInvalid'),
      password: t('account.security.errors.passwordRequired'),
    }),
  ),
  initialValues: { email: '', password: '' },
})
const [email] = defineField('email')
const [password] = defineField('password')

const submit = handleSubmit((v) =>
  change.mutate(v, {
    onSuccess: () => emit('done'),
    onError: (e) => setFieldError('password', messageFor(e)),
  }),
)
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
    <PInput
      v-model="email"
      type="email"
      :label="t('account.security.newEmail')"
      :error="errors.email"
      autocomplete="email"
    />
    <PInput
      v-model="password"
      type="password"
      :label="t('account.security.currentPassword')"
      :error="errors.password"
      autocomplete="current-password"
    />
    <PButton type="submit" :loading="change.isPending.value">
      {{ t('account.security.confirmEmail') }}
    </PButton>
  </form>
</template>
