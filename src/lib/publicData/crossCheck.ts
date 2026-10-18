/**
 * Comprobación cruzada (issue 205): number of positions where the saved order differs from the public
 * source. Only a warning: nothing is changed. Positions the source does not match (null) are not
 * compared, so an unmatched driver never counts as a difference.
 */
export function crossCheckDiff(
  saved: readonly (number | null)[],
  source: readonly (number | null)[],
): number {
  let differs = 0
  source.forEach((to, i) => {
    if (to == null) return
    if ((saved[i] ?? null) !== to) differs++
  })
  return differs
}
