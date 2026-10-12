import { isClosed, type HasDate } from '@/utils/dates'

export type SessionState = 'open' | 'closed' | 'scored'

/**
 * Estado de una sesión: `open` antes de (fecha − 5 min), `closed` después sin resultados,
 * `scored` después con resultados.
 *
 * `hasResults` NO se puede saber solo con `RaceSession` (no tiene ese campo). Las pantallas
 * (G2, G4, G5, H1, H5) lo derivan de la consulta de resultados de la sesión (hay resultados
 * publicados = lista no vacía) hasta que la API confirme un campo propio. Mientras la sesión
 * esté abierta se ignora: los resultados nunca adelantan el cierre.
 */
export function sessionState(
  session: HasDate,
  now: Date | number = Date.now(),
  hasResults = false,
): SessionState {
  if (!isClosed(session, now)) return 'open'
  return hasResults ? 'scored' : 'closed'
}

/** Los pronósticos ajenos solo se piden (y se muestran) una vez cerrada la sesión. */
export function canSeeOthers(state: SessionState): boolean {
  return state !== 'open'
}
