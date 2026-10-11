import { useForm } from 'vee-validate'
import { computed, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import type { User } from '@/api'
import { diffProfile, profileSchema, toDateInput, type ProfileValues } from '@/lib/account'
import { toTypedSchema } from '@/lib/zod-form'

/**
 * Profile fields of the account settings (U3): VeeValidate + Zod, with the server values as the
 * baseline. `patch` holds only the changed fields; `reset()` goes back to the server values and
 * the form follows the user whenever it is refreshed (after saving).
 */
export function useProfileForm(user: MaybeRefOrGetter<Omit<User, 'hashedPassword'> | null>) {
  const { t } = useI18n()
  const schema = profileSchema({
    bioMax: t('account.profile.errors.bioMax'),
    locationMax: t('account.profile.errors.locationMax'),
    birthdate: t('account.profile.errors.birthdate'),
  })
  const original = computed<ProfileValues>(() => {
    const u = toValue(user)
    return {
      bio: u?.bio ?? '',
      location: u?.location ?? '',
      birthdate: toDateInput(u?.birthdate),
      timeZone: u?.timeZone ?? '',
    }
  })
  const { values, errors, validate, resetForm, defineField, submitCount } = useForm<ProfileValues>({
    validationSchema: toTypedSchema(schema),
    initialValues: original.value,
  })
  const [bio] = defineField('bio')
  const [location] = defineField('location')
  const [birthdate] = defineField('birthdate')
  const [timeZone] = defineField('timeZone')

  watch(original, (v) => resetForm({ values: v }))

  const patch = computed(() => diffProfile(original.value, values))
  const count = computed(() => Object.keys(patch.value).length)
  const reset = () => resetForm({ values: original.value })

  return { bio, location, birthdate, timeZone, errors, patch, count, reset, validate, submitCount }
}

export type ProfileForm = ReturnType<typeof useProfileForm>
