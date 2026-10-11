/** Emitted on any 401 so the session store (T4) clears state and the router (T3) redirects. */
export const SESSION_EXPIRED_EVENT = 'session-expired'
const CONTRACT_ERROR_EVENT = 'contract-error'

export interface ContractErrorDetail {
  path: string
  issues: unknown
}

const bus = new EventTarget()

export function onSessionExpired(handler: () => void): () => void {
  const fn = () => handler()
  bus.addEventListener(SESSION_EXPIRED_EVENT, fn)
  return () => bus.removeEventListener(SESSION_EXPIRED_EVENT, fn)
}

export function emitSessionExpired(): void {
  bus.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

/** T14 subscribes here to log contract violations. */
export function onContractError(handler: (d: ContractErrorDetail) => void): () => void {
  const fn = (e: Event) => handler((e as CustomEvent<ContractErrorDetail>).detail)
  bus.addEventListener(CONTRACT_ERROR_EVENT, fn)
  return () => bus.removeEventListener(CONTRACT_ERROR_EVENT, fn)
}

export function emitContractError(detail: ContractErrorDetail): void {
  bus.dispatchEvent(new CustomEvent(CONTRACT_ERROR_EVENT, { detail }))
}
