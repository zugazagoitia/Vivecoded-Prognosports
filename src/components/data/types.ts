export type HitKind = 'exact' | 'near' | 'far' | 'miss' | 'hidden'

export interface SlotDriver {
  code: string
  name: string
  /** CSS colour of the team (4 px bar only, never the text colour). */
  teamColor?: string
  /** Second line («McLaren · sale P1»). */
  subtitle?: string
}

export interface SlotDrop {
  /** Position of the slot the driver was dragged from. */
  fromPosition?: number
  /** Code of a driver dragged from the pool. */
  driverCode?: string
}

export interface ValidationItem {
  label: string
  state: 'ok' | 'warn' | 'err'
  href?: string
}
