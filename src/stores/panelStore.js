import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMarketStore, useMarket2Store } from '@/stores/marketStore.js'

export const usePanelStore = defineStore('panel', () => {
  const splitMode    = ref(false)
  const activePanelId = ref('primary') // 'primary' | 'secondary'

  const activeTicker = computed(() =>
    activePanelId.value === 'secondary'
      ? useMarket2Store().activeTicker
      : useMarketStore().activeTicker
  )

  function toggleSplit() {
    splitMode.value = !splitMode.value
    if (!splitMode.value) activePanelId.value = 'primary'
  }

  function setActive(id) {
    if (splitMode.value) activePanelId.value = id
  }

  function setActiveTicker(ticker) {
    if (activePanelId.value === 'secondary') {
      useMarket2Store().setTicker(ticker)
    } else {
      useMarketStore().setTicker(ticker)
    }
  }

  return { splitMode, activePanelId, activeTicker, toggleSplit, setActive, setActiveTicker }
})
