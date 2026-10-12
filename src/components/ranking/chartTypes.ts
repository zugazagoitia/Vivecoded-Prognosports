import type { Tone } from '@/components/charts/model'

export interface LineSeries {
  id: string | number
  label: string
  tone: Tone
  width: number
  values: number[]
  /** Text after the label at the end of the line (value, rank...). */
  end?: string
  opacity?: number
  /** Dashed line (projection). */
  dashed?: boolean
}
