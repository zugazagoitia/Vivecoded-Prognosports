import type { z } from 'zod'
import { AUTH_HEADER_NAME, DEFAULT_TIMEOUT_MS, MAX_UPLOAD_BYTES, authHeaderValue } from './config'
import { ApiError, genericMessage } from './errors'
import { emitContractError, emitSessionExpired } from './events'

/** The session store (T4) registers how to read the token; avoids a circular import. */
let tokenProvider: () => string | null | undefined = () => null
let baseUrl: string = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? ''

export function setTokenProvider(fn: () => string | null | undefined): void {
  tokenProvider = fn
}
export function setBaseUrl(url: string): void {
  baseUrl = url
}

export type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  form?: FormData
  signal?: AbortSignal
  timeoutMs?: number
  /** Skip the auth header (login, register...). */
  anonymous?: boolean
  /** Do not trigger session-expired on 401 (e.g. wrong credentials on login). */
  noSessionExpiry?: boolean
}

/** Percent-encodes a path segment. */
export const seg = (v: string | number): string => encodeURIComponent(String(v))

function buildUrl(path: string, query?: Query): string {
  const url = baseUrl.replace(/\/+$/, '') + path
  if (!query) return url
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v != null) qs.set(k, String(v))
  const s = qs.toString()
  return s ? `${url}?${s}` : url
}

interface Envelope {
  success: boolean
  status?: number
  code?: number
  message?: string
  result?: unknown
}

function isEnvelope(b: unknown): b is Envelope {
  return (
    typeof b === 'object' && b !== null && typeof (b as { success?: unknown }).success === 'boolean'
  )
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text // text/plain (e.g. login token)
  }
}

/** Performs a request, unwraps the ApiResponse envelope (when present) and returns `result`. */
export async function request(path: string, opts: RequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  if (!opts.anonymous) {
    const token = tokenProvider()
    if (token) headers[AUTH_HEADER_NAME] = authHeaderValue(token)
  }

  const timeout = AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout

  let res: Response
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal,
    })
  } catch (e) {
    if (opts.signal?.aborted) throw e // caller cancelled (TanStack Query)
    if (timeout.aborted)
      throw new ApiError(0, undefined, 'La petición ha tardado demasiado.', 'timeout')
    throw new ApiError(0, undefined, 'No se pudo conectar con el servidor.', 'network', e)
  }

  const parsed = await readBody(res)
  const env = isEnvelope(parsed) ? parsed : undefined

  if (res.status === 401 && !opts.noSessionExpiry) emitSessionExpired()

  if (!res.ok || (env && !env.success)) {
    const status = env?.status ?? res.status
    const apiMsg = env?.message ?? (typeof parsed === 'string' && parsed ? parsed : undefined)
    throw new ApiError(status, env?.code, apiMsg || genericMessage(status), 'http', parsed)
  }
  return env ? env.result : parsed
}

/** Like `request`, validating the result with a Zod schema (contract error on mismatch). */
export async function requestParsed<S extends z.ZodType>(
  path: string,
  schema: S,
  opts: RequestOptions = {},
): Promise<z.output<S>> {
  const result = await request(path, opts)
  const check = schema.safeParse(result)
  if (!check.success) {
    emitContractError({ path, issues: check.error.issues })
    throw new ApiError(
      200,
      undefined,
      'La respuesta de la API no tiene el formato esperado.',
      'contract',
      check.error.issues,
    )
  }
  return check.data
}

/** Builds a multipart body, rejecting files over 2 MB before any network call (§3.3). */
export function imageForm(file: File | Blob, field = 'file'): FormData {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, undefined, 'La imagen supera el tamaño máximo de 2 MB.', 'validation')
  }
  const fd = new FormData()
  fd.append(field, file)
  return fd
}

export function uploadImage(
  path: string,
  file: File | Blob,
  signal?: AbortSignal,
): Promise<unknown> {
  return request(path, { method: 'POST', form: imageForm(file), signal })
}
