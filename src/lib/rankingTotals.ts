/**
 * Degraded ranking: when `…/points` comes back empty (`{}`) but `…/totaluserpoints` has values,
 * only a final table by username can be drawn (no GP detail). The real API keys the totals by
 * username (src/api/README.md).
 */
export interface TotalRow {
  name: string
  total: number
  /** Dense position (ties share it). */
  pos: number
  you: boolean
}

export function totalsTable(
  totals: Readonly<Record<string, unknown>> | undefined,
  username?: string,
): TotalRow[] {
  const rows = Object.entries(totals ?? {})
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
    .map(([name, v]) => ({ name, total: v as number }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'))
  let pos = 0
  let last: number | undefined
  return rows.map((r) => {
    if (r.total !== last) {
      pos += 1
      last = r.total
    }
    return { ...r, pos, you: username != null && r.name === username }
  })
}
