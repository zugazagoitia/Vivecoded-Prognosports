<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import { messageFor } from '@/api/messages'
import PButton from '@/components/ui/PButton.vue'
import PInput from '@/components/ui/PInput.vue'
import { passwordSchema } from '@/lib/account'
import { toTypedSchema } from '@/lib/zod-form'
import { useChangePassword } from '@/queries/account'

/**
 * «Cambiar contraseña» (U3, `#correo`): current + new (>= 8) + repeat. Acts on its own (no
 * SaveBar); on success the three fields are emptied and `done` is emitted. A wrong current
 * password is shown under «Contraseña actual». Used in the desktop card and the mobile sheet.
 */
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()
const change = useChangePassword()

const { defineField, errors, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema: toTypedSchema(
    passwordSchema({
      current: t('account.security.errors.passwordRequired'),
      min: t('account.security.errors.min'),
      mismatch: t('account.security.errors.mismatch'),
    }),
  ),
  initialValues: { current: '', next: '', repeat: '' },
})
const [current] = defineField('current')
const [next] = defineField('next')
const [repeat] = defineField('repeat')

const submit = handleSubmit((v) =>
  change.mutate(
    { current: v.current, next: v.next },
    {
      onSuccess: () => {
        resetForm()
        emit('done')
      },
      onError: (e) => setFieldError('current', messageFor(e)),
    },
  ),
)
</script>

<template>
  <form class="grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="submit">
    <PInput
      v-model="current"
      type="password"
      :label="t('account.security.currentPassword')"
      :error="errors.current"
      autocomplete="current-password"
    />
    <span class="max-sm:hidden" aria-hidden="true" />
    <PInput
      v-model="next"
      type="password"
      :label="t('account.security.newPassword')"
      :help="t('account.security.newPasswordHelp')"
      :error="errors.next"
      autocomplete="new-password"
    />
    <PInput
      v-model="repeat"
      type="password"
      :label="t('account.security.repeatPassword')"
      :error="errors.repeat"
      autocomplete="new-password"
    />
    <div class="sm:col-span-2">
      <PButton type="submit" variant="outline" size="sm" :loading="change.isPending.value">
        {{ t('account.security.changePassword') }}
      </PButton>
    </div>
  </form>
</template>
