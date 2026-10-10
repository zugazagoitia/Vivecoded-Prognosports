import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { userApi, type Community } from '@/api'
import { isCommunityKey } from '@/queries/keys'
import { queryClient } from '@/queries/client'
import { STORAGE_KEYS, readStorage, writeStorage } from './storage'

/** Picks the stored id when still valid, else the first community, else null. */
export function resolveActiveId(list: readonly Community[], stored: string | null): number | null {
  const hit = stored != null ? list.find((c) => String(c.id) === stored) : undefined
  return (hit ?? list[0])?.id ?? null
}

/**
 * Active community (§4.10). Persisted locally only: it is not synced to the backend
 * `User.currentCommunity` (open question; local persistence chosen).
 */
export const useCommunityStore = defineStore('community', () => {
  const communities = ref<Community[]>([])
  const activeId = ref<number | null>(null)
  const loaded = ref(false)
  let loading: Promise<void> | null = null

  const active = computed(() => communities.value.find((c) => c.id === activeId.value) ?? null)
  const hasCommunity = computed(() => activeId.value !== null)

  function setActive(id: number | null): void {
    activeId.value = id
    writeStorage(STORAGE_KEYS.community, id === null ? null : String(id))
  }

  /** Switches community without navigating; cached data of that community reloads. */
  function select(id: number): void {
    if (id === activeId.value) return
    setActive(id)
    void queryClient.invalidateQueries({ predicate: (q) => isCommunityKey(q.queryKey, id) })
  }

  function setCommunities(list: Community[]): void {
    communities.value = list
    setActive(resolveActiveId(list, readStorage(STORAGE_KEYS.community)))
    loaded.value = true
  }

  function load(userId: number): Promise<void> {
    loading ??= userApi
      .listUserCommunities(userId)
      .then(setCommunities)
      .finally(() => {
        loading = null
      })
    return loading
  }

  /** In-memory reset; the persisted "last used" id is kept on purpose. */
  function reset(): void {
    communities.value = []
    activeId.value = null
    loaded.value = false
    loading = null
  }

  return {
    communities,
    activeId,
    active,
    hasCommunity,
    loaded,
    select,
    setCommunities,
    load,
    reset,
  }
})
