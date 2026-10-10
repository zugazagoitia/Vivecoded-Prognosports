export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'contract' | 'validation'

/** Normalised API error. `message` is Spanish when the API provides it. */
export class ApiError extends Error {
  readonly status: number
  readonly code: number | undefined
  readonly kind: ApiErrorKind
  readonly details?: unknown

  constructor(
    status: number,
    code: number | undefined,
    message: string,
    kind: ApiErrorKind = 'http',
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.kind = kind
    this.details = details
  }

  get isContractError(): boolean {
    return this.kind === 'contract'
  }
}

const GENERIC: Record<number, string> = {
  400: 'La solicitud no es válida.',
  401: 'Tu sesión ha caducado.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se ha encontrado el recurso solicitado.',
  409: 'La operación entra en conflicto con el estado actual.',
  500: 'Error interno del servidor.',
}

export function genericMessage(status: number): string {
  return GENERIC[status] ?? (status >= 500 ? GENERIC[500]! : 'Se ha producido un error inesperado.')
}
