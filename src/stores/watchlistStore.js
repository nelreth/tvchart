import { defineStore } from 'pinia'
import {
  fetchWatchlistColors,
  fetchWatchlists,
  fetchWatchlistItems,
  addWatchlistItem,
  removeWatchlistItem,
  createWatchlist,
} from '@/core/api.js'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore.js'

export const useWatchlistStore = defineStore('watchlist', {
  state: () => ({
    colors:     [],     // [{ id, name, hex_code }]
    watchlists: [],     // [{ id, name, type, color_id, description, item_count }]
    items:      {},     // { [watchlist_id]: [{ ticker, note }] }
    isLoaded:   false,
    error:      null,
  }),

  getters: {
    namedLists: (state) => state.watchlists.filter(w => w.type === 'named'),
    colorLists: (state) => state.watchlists.filter(w => w.type === 'color'),

    colorById: (state) => (id) =>
      state.colors.find(c => c.id === id) ?? null,

    // Zwraca color_id (z tabeli watchlist_colors) przypisany do tickera, lub null
    activeColorId: (state) => (ticker) => {
      for (const wl of state.watchlists.filter(w => w.type === 'color')) {
        if (state.items[wl.id]?.some(i => i.ticker === ticker)) return wl.color_id
      }
      return null
    },

    tickerInWatchlist: (state) => (wid, ticker) =>
      !!state.items[wid]?.some(i => i.ticker === ticker),
  },

  actions: {
    async init() {
      if (this.isLoaded) return
      this.error = null
      try {
        const [colors, watchlists] = await Promise.all([
          fetchWatchlistColors(),
          fetchWatchlists(),
        ])
        this.colors     = colors
        this.watchlists = watchlists
        this.isLoaded   = true
        // Załaduj items list kolorystycznych – potrzebne do wyświetlania flagi
        await this._loadColorItems()
      } catch (e) {
        this.error = e.message
        console.error('watchlistStore.init:', e)
      }
    },

    async _loadColorItems() {
      const colorWls = this.watchlists.filter(w => w.type === 'color')
      await Promise.all(colorWls.map(wl => this._fetchItems(wl.id)))
    },

    async _fetchItems(wid) {
      if (this.items[wid] !== undefined) return   // już w cache
      try {
        const data = await fetchWatchlistItems(wid)
        this.items[wid] = data
      } catch (e) {
        this.items[wid] = []
        console.error(`fetchItems(${wid}):`, e)
      }
    },

    async loadAllItems() {
      await Promise.all(this.watchlists.map(wl => this._fetchItems(wl.id)))
    },

    // Przełącz ticker w liście kolorystycznej (ticker może być tylko w 1 liście koloru)
    // Przełącz ticker w kategorii koloru (colorId = id z tabeli watchlist_colors)
    // Jeśli watchlista dla tego koloru nie istnieje – tworzy ją automatycznie
    async toggleColor(ticker, colorId) {
      try {
        // Znajdź lub utwórz watchlistę typu color dla tego colorId
        let wl = this.colorLists.find(w => w.color_id === colorId)
        if (!wl) {
          const color = this.colorById(colorId)
          wl = await createWatchlist({
            name:     color?.name ?? String(colorId),
            type:     'color',
            color_id: colorId,
          })
          this.watchlists.push(wl)
          this.items[wl.id] = []
        }

        const isIn = this.tickerInWatchlist(wl.id, ticker)
        if (isIn) {
          await removeWatchlistItem(wl.id, ticker)
          this.items[wl.id] = this.items[wl.id].filter(i => i.ticker !== ticker)
        } else {
          // Usuń z innych list kolorystycznych (ticker może być tylko w 1)
          for (const other of this.colorLists) {
            if (other.id !== wl.id && this.tickerInWatchlist(other.id, ticker)) {
              await removeWatchlistItem(other.id, ticker)
              this.items[other.id] = this.items[other.id].filter(i => i.ticker !== ticker)
            }
          }
          await addWatchlistItem(wl.id, ticker)
          if (!this.items[wl.id]) this.items[wl.id] = []
          this.items[wl.id] = [...this.items[wl.id], { ticker, note: null }]
        }
      } catch (e) {
        useUiFeedbackStore().notify('error', `Błąd zmiany koloru: ${e.message}`)
      }
    },

    async addToNamed(wid, ticker) {
      if (this.tickerInWatchlist(wid, ticker)) return
      try {
        await addWatchlistItem(wid, ticker)
        if (!this.items[wid]) this.items[wid] = []
        this.items[wid] = [...this.items[wid], { ticker, note: null }]
        const wl = this.watchlists.find(w => w.id === wid)
        useUiFeedbackStore().notify('success', `${ticker} dodany do listy „${wl?.name ?? wid}”`)
      } catch (e) {
        useUiFeedbackStore().notify('error', `Nie udało się dodać ${ticker} do listy`)
      }
    },

    async removeFrom(wid, ticker) {
      try {
        await removeWatchlistItem(wid, ticker)
        if (this.items[wid]) {
          this.items[wid] = this.items[wid].filter(i => i.ticker !== ticker)
        }
      } catch (e) {
        useUiFeedbackStore().notify('error', `Nie udało się usunąć ${ticker} z listy`)
      }
    },

    async createNamed(name) {
      try {
        const wl = await createWatchlist({ name, type: 'named' })
        this.watchlists.push(wl)
        this.items[wl.id] = []
        useUiFeedbackStore().notify('success', `Lista „${name}” została utworzona`)
        return wl
      } catch (e) {
        useUiFeedbackStore().notify('error', `Nie udało się utworzyć listy „${name}”`)
        throw e
      }
    },
  },
})
