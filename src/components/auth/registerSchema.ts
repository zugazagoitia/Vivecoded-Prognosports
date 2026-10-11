import { z } from 'zod'
import { t } from '@/i18n'
import { PASSWORD_MIN } from './passwordStrength'

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20

/** Same rule as the mockup: something@something.tld without spaces. */
export const isEmailInvalid = (value: string): boolean =>
  value.length > 0 && !/^\S+@\S+\.\S+$/.test(value)

/**
 * Pending confirmation with the backend: allowed username characters and password rules.
 * Defaults: 3-20 of letters, digits, `_`, `.`, `-`; password minimum 8.
 */
export const registerSchema = z.object({
  username: z
    .string()
    .min(1, t('register.username.required'))
    .min(USERNAME_MIN, t('register.username.length'))
    .max(USERNAME_MAX, t('register.username.length'))
    .regex(/^[A-Za-z0-9_.-]+$/, t('register.username.chars')),
  email: z
    .string()
    .min(1, t('register.email.required'))
    .refine((v) => !isEmailInvalid(v), t('register.email.invalid')),
  password: z
    .string()
    .min(1, t('register.password.required'))
    .min(PASSWORD_MIN, t('register.password.min')),
  terms: z.boolean().refine((v) => v, t('register.terms.required')),
})
export type RegisterForm = z.input<typeof registerSchema>
