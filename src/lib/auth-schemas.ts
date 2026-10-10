import { z } from 'zod'

/** Correo normalizado (trim + minúsculas). Mensajes ya traducidos por quien llama. */
export function emailSchema(messages: { required: string; invalid: string }) {
  return z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: messages.required, abort: true })
    .pipe(z.email({ error: messages.invalid }))
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}
