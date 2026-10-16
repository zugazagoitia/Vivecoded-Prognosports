/** Elements that stick to the bottom of the viewport and must stay uncovered by the reviewer panel. */
export const BOTTOM_BAR_SELECTOR = '.tab-bar, [data-bottom-bar]'

/** Gap (px) kept between the panel and the bar below it. */
const GAP = 8

/**
 * Height (px) from the viewport bottom up to the top of the bottom bars the panel would otherwise
 * cover, so it can sit above them. Measured, not hardcoded: it includes the safe-area inset and
 * sticky bars that only stick while scrolling. Bars are stacked from the lowest up; a bar in the
 * page flow (not stuck) that ends above the panel's top does not push it. `panelHeight` is the
 * panel's current height (bubble, or bubble plus list).
 */
export function measureBottomInset(doc: Document, viewportHeight: number, panelHeight = 0): number {
  const rects = [...doc.querySelectorAll(BOTTOM_BAR_SELECTOR)]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.height > 0 && r.bottom > 0 && r.top < viewportHeight)
    .sort((a, b) => b.top - a.top)
  let inset = 0
  for (const r of rects) {
    // The panel would span [edge - panelHeight, edge] with edge = viewportHeight - inset - GAP.
    if (r.bottom > viewportHeight - inset - GAP - panelHeight)
      inset = Math.max(inset, viewportHeight - r.top)
  }
  return Math.round(inset)
}
