import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    theme: localStorage.getItem('theme') || 'dark',
    isFullscreen: false,
    activePanel: null,          // 'watchlist' | 'scanners' | 'fundamentals' | null
    isContextPanelOpen: false,
    screenshotTrigger: 0,       // inkrementowany aby wywołać screenshot w ChartView
    lineToolTrigger: 0,         // inkrementowany aby wywołać tryb rysowania w ChartView
    pendingLineToolType: null,  // np. 'TrendLine'
    drawingMode: false,           // tryb rysowania linii na wykresie
  }),

  actions: {
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', this.theme)
      document.documentElement.setAttribute('data-theme', this.theme)
    },

    async toggleFullscreen() {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen()
          this.isFullscreen = true
        } else {
          await document.exitFullscreen()
          this.isFullscreen = false
        }
      } catch (e) {
        console.warn('Fullscreen API error:', e)
      }
    },

    setActivePanel(panelKey) {
      if (this.activePanel === panelKey && this.isContextPanelOpen) {
        this.closePanel()
      } else {
        this.activePanel = panelKey
        this.isContextPanelOpen = true
      }
    },

    closePanel() {
      this.activePanel = null
      this.isContextPanelOpen = false
    },

    requestScreenshot() {
      this.screenshotTrigger++
    },

    requestLineTool(toolType = 'TrendLine') {
      this.pendingLineToolType = toolType
      this.lineToolTrigger++
    },

    toggleDrawingMode() {
      this.drawingMode = !this.drawingMode
    },
  },
})
