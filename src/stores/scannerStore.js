import { defineStore } from 'pinia'
import { fetchScanners, fetchScannerResults } from '@/core/api.js'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore.js'

export const useScannerStore = defineStore('scanner', {
  state: () => ({
    scanners:         [],    // [{ id, name, description, last_run_at, last_status, result_count }]
    results:          {},    // { [scanner_id]: [{ ticker, rank, ...values }] }
    expandedId:       null,  // id aktualnie rozwiniętego skanera
    isLoaded:         false,
    isLoadingResults: false,
    error:            null,
  }),

  getters: {
    activeScanner: (state) =>
      state.scanners.find(s => s.id === state.expandedId) ?? null,

    activeResults: (state) =>
      state.expandedId ? (state.results[state.expandedId] ?? null) : null,
    // null = nie załadowano jeszcze, [] = załadowano i pusto
  },

  actions: {
    async init() {
      if (this.isLoaded) return
      this.error = null
      try {
        this.scanners = await fetchScanners()
        this.isLoaded = true
      } catch (e) {
        this.error = e.message
        useUiFeedbackStore().notify('error', `Nie można załadować skanerów: ${e.message}`)
        console.error('scannerStore.init:', e)
      }
    },

    async toggleExpand(scannerId) {
      if (this.expandedId === scannerId) {
        this.expandedId = null
        return
      }
      this.expandedId = scannerId
      if (this.results[scannerId] === undefined) {
        await this._loadResults(scannerId)
      }
    },

    async _loadResults(scannerId) {
      this.isLoadingResults = true
      try {
        const data = await fetchScannerResults(scannerId)
        this.results[scannerId] = data
      } catch (e) {
        this.results[scannerId] = []
        console.error(`scannerStore.loadResults(${scannerId}):`, e)
      } finally {
        this.isLoadingResults = false
      }
    },

    async refreshResults(scannerId) {
      delete this.results[scannerId]
      await this._loadResults(scannerId)
    },
  },
})
