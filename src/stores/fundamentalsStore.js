import { defineStore } from 'pinia'
import { fetchFundamentals } from '@/core/api.js'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore.js'

export const useFundamentalsStore = defineStore('fundamentals', {
  state: () => ({
    cache:     {},    // { [ticker]: { data, fetched_at } | 'not_found' }
    isLoading: false,
    error:     null,
  }),

  getters: {
    // Zwraca: obiekt z danymi | 'not_found' | null (nie załadowano)
    dataFor: (state) => (ticker) => state.cache[ticker] ?? null,
  },

  actions: {
    async load(ticker) {
      if (!ticker) return
      if (this.cache[ticker] !== undefined) return  // w cache (też 'not_found')

      this.isLoading = true
      this.error     = null
      try {
        const res = await fetchFundamentals(ticker)
        this.cache[ticker] = res
      } catch (e) {
        if (e.message.startsWith('HTTP 404')) {
          this.cache[ticker] = 'not_found'
        } else {
          this.error = e.message
          useUiFeedbackStore().notify('error', `Błąd ładowania fundamentals dla ${ticker}`)
          useUiFeedbackStore().notify('error', `Błąd ładowania fundamentals dla ${ticker}`)
          console.error(`fundamentalsStore.load(${ticker}):`, e)
        }
      } finally {
        this.isLoading = false
      }
    },
  },
})
