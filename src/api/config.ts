/** Single place to change the auth header format if the backend differs (T2 "A confirmar"). */
export const AUTH_HEADER_NAME = 'Authorization'
export const AUTH_SCHEME = 'Bearer'
export const authHeaderValue = (token: string): string => `${AUTH_SCHEME} ${token}`

export const DEFAULT_TIMEOUT_MS = 15_000
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
