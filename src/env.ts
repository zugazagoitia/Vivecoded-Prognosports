import { z } from 'zod'

/** CI passes unset repo variables as `""`; for optional vars that means "not configured". */
const emptyAsUndefined = (v: unknown) => (v === '' ? undefined : v)

export const envSchema = z.object({
  VITE_API_BASE_URL: z
    .url({ error: 'debe ser una URL válida (p. ej. https://api.prognosports.com)' })
    .refine((u) => !/\/v2\/*$/.test(u.split(/[?#]/)[0] ?? u), {
      error: 'no debe terminar en /v2: los envoltorios de src/api ya añaden ese prefijo',
    }),
  VITE_GIT_SHA: z.string().min(1, 'no puede estar vacío'),
  VITE_GIT_DATE: z.string().min(1, 'no puede estar vacío'),
  VITE_APP_VERSION: z.string().min(1, 'no puede estar vacío'),
  VITE_SENTRY_DSN: z.preprocess(
    emptyAsUndefined,
    z.url({ error: 'debe ser una URL válida (DSN de Sentry)' }).optional(),
  ),
  VITE_CF_ANALYTICS_TOKEN: z.preprocess(emptyAsUndefined, z.string().optional()),
})

export type Env = z.infer<typeof envSchema>

export class EnvError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(`Configuración de entorno inválida:\n${issues.join('\n')}`)
    this.name = 'EnvError'
    this.issues = issues
  }
}

/** Validates raw env values. Throws EnvError naming every offending variable. */
export function parseEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw)
  if (result.success) return result.data
  throw new EnvError(
    result.error.issues.map((i) => {
      const name = String(i.path[0] ?? '?')
      return `- ${name}: ${raw[name] === undefined ? 'falta la variable' : i.message}`
    }),
  )
}

/** Validated env of the running app. Call once at startup (main.ts). */
export function loadEnv(): Env {
  return parseEnv(import.meta.env)
}
