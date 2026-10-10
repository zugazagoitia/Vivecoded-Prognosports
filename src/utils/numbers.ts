const MINUS = '−'
const THIN_NBSP = ' '

function fmt(abs: number, maxFractionDigits: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: maxFractionDigits }).format(abs)
}

/** Redondea y elimina -0. */
function clean(n: number, digits = 0): number {
  const v = Number(n.toFixed(digits))
  return v === 0 ? 0 : v
}

/** Número con separadores es-ES y signo menos real. */
export function formatNumber(n: number, maxFractionDigits = 0): string {
  const v = clean(n, maxFractionDigits)
  return (v < 0 ? MINUS : '') + fmt(Math.abs(v), maxFractionDigits)
}

/** «+2», «−3», «0». */
export function formatSigned(n: number): string {
  const v = clean(n)
  if (v === 0) return '0'
  return (v > 0 ? '+' : MINUS) + fmt(Math.abs(v), 0)
}

/** «4.º». */
export function formatOrdinal(n: number): string {
  return `${fmt(n, 0)}.º`
}

/** «62 %» con espacio fino no separable. */
export function formatPercent(value: number, maxFractionDigits = 0): string {
  return `${formatNumber(value, maxFractionDigits)}${THIN_NBSP}%`
}
