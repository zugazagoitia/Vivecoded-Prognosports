import { ref, type Ref } from 'vue'
import {
  firstEmpty,
  move,
  normalize,
  place,
  removeAt,
  sameSel,
  swapSlots,
  type Sel,
} from '@/lib/predict'

/**
 * State of the prediction being edited: `sel` (N slots with a driver id or empty), the active
 * slot `act` (-1 none), `dirty` (differs from what was loaded/saved) and `saved` (just saved).
 * Every mutation goes through `put`, so the rules live in `@/lib/predict` (pure, unit-tested).
 */
export function usePredictionDraft(n: Ref<number>) {
  const sel = ref<Sel>([])
  const act = ref(0)
  const dirty = ref(false)
  const saved = ref(false)
  /** Last loaded/saved prediction: what «Descartar» goes back to. */
  const base = ref<Sel>([])

  /** Loads a prediction as the new baseline (and optionally an unsaved draft on top). */
  function load(from: readonly (number | null)[], draft?: readonly (number | null)[] | null) {
    base.value = normalize(from, n.value)
    sel.value = normalize(draft ?? from, n.value)
    dirty.value = draft != null && !sameSel(sel.value, base.value)
    saved.value = false
    act.value = firstEmpty(sel.value)
  }

  /** Refreshes the baseline from the server without touching what the user is editing. */
  function rebase(from: readonly (number | null)[]) {
    base.value = normalize(from, n.value)
    if (!dirty.value) {
      sel.value = [...base.value]
      if (act.value >= n.value) act.value = firstEmpty(sel.value)
    }
  }

  function put(next: Sel, nextAct?: number) {
    sel.value = next
    act.value = nextAct ?? firstEmpty(next)
    dirty.value = !sameSel(next, base.value)
    saved.value = false
  }

  /** Pool click / drop from the pool. Returns the slot used, or -1 if there was none. */
  function placeDriver(driver: number, at = act.value): number {
    const next = place(sel.value, driver, at)
    if (!next) return -1
    put(next)
    return next.indexOf(driver)
  }

  /** Moves the pick of slot `i` one place; returns its new index (or -1 at the ends). */
  function moveSlot(i: number, dir: -1 | 1): number {
    const next = move(sel.value, i, dir)
    if (!next) return -1
    put(next, act.value)
    return i + dir
  }

  function remove(i: number) {
    put(removeAt(sel.value, i), i)
  }

  function swap(from: number, to: number) {
    put(swapSlots(sel.value, from, to))
  }

  function clear() {
    put(normalize([], n.value), 0)
  }

  function replaceAll(list: Sel) {
    put(normalize(list, n.value), -1)
  }

  function discard() {
    sel.value = [...base.value]
    act.value = firstEmpty(sel.value)
    dirty.value = false
    saved.value = false
  }

  /** The server accepted `sel`: it becomes the baseline. */
  function markSaved() {
    base.value = [...sel.value]
    dirty.value = false
    saved.value = true
  }

  return {
    sel,
    act,
    dirty,
    saved,
    base,
    load,
    rebase,
    put,
    placeDriver,
    moveSlot,
    remove,
    swap,
    clear,
    replaceAll,
    discard,
    markSaved,
  }
}
