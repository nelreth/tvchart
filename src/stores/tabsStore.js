import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMarketStore } from '@/stores/marketStore.js'

let _nextId = 1

export const useTabsStore = defineStore('tabs', () => {
  // { id, ticker, snapshot: { candles, hasMoreHistory, lastBeforeCursor } | null }
  const tabs = ref([])
  const activeTabId = ref(null)

  function init() {
    const ms = useMarketStore()
    const first = { id: _nextId++, ticker: ms.activeTicker, snapshot: null }
    tabs.value = [first]
    activeTabId.value = first.id
  }

  function _activeTab() {
    return tabs.value.find(t => t.id === activeTabId.value) ?? null
  }

  function _snapshot() {
    const ms = useMarketStore()
    const tab = _activeTab()
    if (!tab) return
    tab.ticker = ms.activeTicker
    tab.snapshot = {
      candles: ms.candles.slice(),
      hasMoreHistory: ms.hasMoreHistory,
      lastBeforeCursor: ms.lastBeforeCursor,
    }
  }

  function _restore(tab) {
    const ms = useMarketStore()
    if (tab.snapshot?.candles?.length) {
      ms.$patch({
        activeTicker: tab.ticker,
        candles: tab.snapshot.candles,
        hasMoreHistory: tab.snapshot.hasMoreHistory,
        lastBeforeCursor: tab.snapshot.lastBeforeCursor,
        isLoadingChart: false,
        error: null,
      })
      localStorage.setItem('lastTicker', tab.ticker)
    } else {
      ms.setTicker(tab.ticker)
    }
  }

  function switchTab(id) {
    if (id === activeTabId.value) return
    _snapshot()
    activeTabId.value = id
    const target = tabs.value.find(t => t.id === id)
    if (target) _restore(target)
  }

  function addTab() {
    const ms = useMarketStore()
    _snapshot()
    const tab = { id: _nextId++, ticker: ms.activeTicker, snapshot: null }
    tabs.value.push(tab)
    activeTabId.value = tab.id
    ms.setTicker(ms.activeTicker)
  }

  function closeTab(id) {
    if (tabs.value.length <= 1) return
    const idx = tabs.value.findIndex(t => t.id === id)
    if (idx === -1) return
    const wasActive = id === activeTabId.value
    tabs.value.splice(idx, 1)
    if (wasActive) {
      const next = tabs.value[Math.max(0, idx - 1)]
      activeTabId.value = next.id
      _restore(next)
    }
  }

  // Wywoływane gdy marketStore.activeTicker zmienia się (np. z TopToolbar)
  function syncActiveTicker(ticker) {
    const tab = _activeTab()
    if (tab) tab.ticker = ticker
  }

  return { tabs, activeTabId, init, switchTab, addTab, closeTab, syncActiveTicker }
})
