/** Relative luminance (WCAG) of a `#rgb` / `#rrggbb` colour; invalid input is treated as mid-grey. */
export function luminance(color: string): number {
  let h = color.trim().replace(/^#/, '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0.2
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!
}

/**
 * Text colour readable on `background`: `'white'` or `'dark'`, whichever has more contrast.
 * Used by team-coloured chips (DriverRow dorsal), where white is not always legible.
 */
export function textColorFor(background: string): 'white' | 'dark' {
  const l = luminance(background)
  const contrastWhite = 1.05 / (l + 0.05)
  const contrastDark = (l + 0.05) / 0.06 // dark text is near-black (luminance ~0.01)
  return contrastWhite >= contrastDark ? 'white' : 'dark'
}
