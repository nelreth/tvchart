import { defineStore } from 'pinia'
import { fetchPrices } from '@/core/api.js'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore.js'

const PAGE_SIZE = 300

function calculateMA(candles, period) {
  const result = []
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      continue
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) sum += candles[i - j].close
      result.push({ time: candles[i].time, value: sum / period })
    }
  }
  return result
}

export const useMarketStore = defineStore('market', {
  state: () => ({
    activeTicker: localStorage.getItem('lastTicker') || 'AAPL',
    candles: [],
    isLoadingChart: false,
    hasMoreHistory: true,
    lastBeforeCursor: null,   // data YYYY-MM-DD do paginacji wstecz
    error: null,
  }),

  getters: {
    ma10:       (state) => calculateMA(state.candles, 10),
    ma20:       (state) => calculateMA(state.candles, 20),
    ma50:       (state) => calculateMA(state.candles, 50),
    volumeData: (state) => state.candles.map(c => ({
      time:  c.time,
      value: c.volume,
      color: c.close >= c.open ? '#26a69a80' : '#ef535080',
    })),
  },

  actions: {
    async setTicker(ticker) {
      this.activeTicker = ticker.toUpperCase()
      localStorage.setItem('lastTicker', this.activeTicker)
      this.candles = []
      this.hasMoreHistory = true
      this.lastBeforeCursor = null
      this.error = null
      await this.loadInitialPrices()
    },

    async loadInitialPrices() {
      this.isLoadingChart = true
      this.error = null
      try {
        const data = await fetchPrices(this.activeTicker, { limit: PAGE_SIZE })
        this.candles = this._mapCandles(data)
        this.hasMoreHistory = data.length === PAGE_SIZE
        this._updateCursor()
      } catch (e) {
        this.error = e.message
        useUiFeedbackStore().notify('error', `Błąd ładowania danych dla ${this.activeTicker}: ${e.message}`)
      } finally {
        this.isLoadingChart = false
      }
    },

    async loadMoreHistory() {
      if (!this.hasMoreHistory || this.isLoadingChart || !this.lastBeforeCursor) return
      this.isLoadingChart = true
      try {
        const data = await fetchPrices(this.activeTicker, {
          limit: PAGE_SIZE,
          before: this.lastBeforeCursor,
        })
        if (data.length === 0) {
          this.hasMoreHistory = false
          return
        }
        const older = this._mapCandles(data)
        this.candles = [...older, ...this.candles]
        this.hasMoreHistory = data.length === PAGE_SIZE
        this.lastBeforeCursor = this._toDateStr(older[0].time)
      } catch (e) {
        this.error = e.message
        useUiFeedbackStore().notify('error', `Błąd ładowania historii: ${e.message}`)
      } finally {
        this.isLoadingChart = false
      }
    },

    // --- helpers ---
    _mapCandles(data) {
      return data.map(d => ({
        time:   Math.floor(d.timestamp / 1000),  // ms -> s (wymóg Lightweight Charts)
        open:   d.open,
        high:   d.high,
        low:    d.low,
        close:  d.close,
        volume: d.volume,
      }))
    },

    _updateCursor() {
      if (this.candles.length > 0) {
        this.lastBeforeCursor = this._toDateStr(this.candles[0].time)
      }
    },

    _toDateStr(unixSeconds) {
      return new Date(unixSeconds * 1000).toISOString().split('T')[0]
    },
  },
})
