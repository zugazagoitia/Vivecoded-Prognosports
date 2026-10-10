import faq from '@/i18n/es/faq.json'

export interface FaqItem {
  /** Index into `FAQ_CATEGORIES` (never 0, that is «Todas»). */
  category: number
  question: string
  answer: string
}

/** Category labels; index 0 is «Todas» (no filter). */
export const FAQ_CATEGORIES: string[] = faq.categories
export const FAQ_ITEMS: FaqItem[] = faq.items

/** Lowercase and strip diacritics so «pronostico» finds «pronóstico». */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function filterFaq(items: FaqItem[], q: string, cat: number): FaqItem[] {
  const needle = normalize(q)
  return items.filter(
    (i) =>
      (cat === 0 || i.category === cat) &&
      (!needle || normalize(`${i.question} ${i.answer}`).includes(needle)),
  )
}

/** Accordion state: `open` is the id of the open item or '' for none. */
export function toggleOpen(current: string, id: string): string {
  return current === id ? '' : id
}
