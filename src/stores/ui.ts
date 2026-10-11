import { ref } from 'vue'
import { defineStore } from 'pinia'

/** Ephemeral global UI state (never persisted). */
export const useUiStore = defineStore('ui', () => {
  const flagsPanelOpen = ref(false)

  function reset(): void {
    flagsPanelOpen.value = false
  }

  return { flagsPanelOpen, reset }
})
