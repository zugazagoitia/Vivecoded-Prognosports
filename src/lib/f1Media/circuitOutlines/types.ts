export interface CircuitOutline {
  id: string
  name: string
  lat: number
  lon: number
  /** Size of the drawing box (path coordinates are integers inside it). */
  w: number
  h: number
  /** Closed SVG path data of the track centre line. */
  d: string
}
