import { computed, reactive, ref } from 'vue'

export type SeriesToken =
  'series-you' | 'series-2' | 'series-3' | 'series-4' | 'series-5' | 'series-6' | 'series-rest'

const PALETTE: SeriesToken[] = ['series-2', 'series-3', 'series-4', 'series-5', 'series-6']

/**
 * Which players are highlighted in the charts. The signed-in player («Tú») is always on and
 * cannot be removed; at most `max` others (a sixth evicts the oldest). Each player keeps the
 * colour they got for as long as they stay highlighted.
 */
export function useHighlight(meId: string, max = PALETTE.length) {
  const limit = Math.min(max, PALETTE.length)
  const others = ref<string[]>([]) // oldest first
  const colors = reactive<Record<string, SeriesToken>>({})

  function add(id: string) {
    if (id === meId || others.value.includes(id)) return
    if (limit <= 0) return
    if (others.value.length >= limit) remove(others.value[0]!)
    const used = new Set(Object.values(colors))
    colors[id] = PALETTE.find((c) => !used.has(c)) ?? 'series-rest'
    others.value.push(id)
  }
  function remove(id: string) {
    if (id === meId) return
    others.value = others.value.filter((x) => x !== id)
    delete colors[id]
  }
  function toggle(id: string) {
    if (others.value.includes(id)) remove(id)
    else add(id)
  }
  /** Preset («Top 5», «Mi entorno», «Todos»): players already on keep their colour. */
  function set(ids: string[]) {
    const wanted = ids.filter((id) => id !== meId).slice(0, limit)
    for (const id of [...others.value]) if (!wanted.includes(id)) remove(id)
    for (const id of wanted) add(id)
  }
  function isOn(id: string) {
    return id === meId || others.value.includes(id)
  }
  function colorOf(id: string): SeriesToken {
    return id === meId ? 'series-you' : (colors[id] ?? 'series-rest')
  }

  return {
    highlighted: computed(() => [meId, ...others.value]),
    add,
    remove,
    toggle,
    set,
    isOn,
    colorOf,
  }
}
