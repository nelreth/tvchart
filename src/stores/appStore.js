import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTheme } from '@/core/themes.js'

export const useAppStore = defineStore('app', () => {
  const theme = ref(localStorage.getItem('theme') || 'dark')
  const themeColors = ref(getTheme(theme.value))

  const isFullscreen = ref(false)
  const drawingMode = ref(false)

  const screenshotTrigger = ref(0)
  const screenshotMode = ref('file') // 'file' | 'clipboard'
  const lineToolTrigger = ref(0)
  const pendingLineToolType = ref(null)

  const activePanel = ref('watchlist')
  const isContextPanelOpen = ref(false)

  function setTheme(newTheme) {
    if (!['light', 'dark'].includes(newTheme)) return
    theme.value = newTheme
    themeColors.value = getTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        isFullscreen.value = true
      } else {
        await document.exitFullscreen()
        isFullscreen.value = false
      }
    } catch {
      isFullscreen.value = Boolean(document.fullscreenElement)
    }
  }

  function toggleDrawingMode() {
    drawingMode.value = !drawingMode.value
  }

  function requestScreenshot(mode = 'file') {
    screenshotMode.value = mode
    screenshotTrigger.value += 1
  }

  function requestLineTool(toolType = 'TrendLine') {
    pendingLineToolType.value = toolType
    lineToolTrigger.value += 1
  }

  function setActivePanel(panelKey) {
    if (activePanel.value === panelKey && isContextPanelOpen.value) {
      isContextPanelOpen.value = false
      return
    }
    activePanel.value = panelKey
    isContextPanelOpen.value = true
  }

  function closePanel() {
    isContextPanelOpen.value = false
  }

  return {
    theme,
    themeColors,
    isFullscreen,
    drawingMode,
    screenshotTrigger,
    screenshotMode,
    lineToolTrigger,
    pendingLineToolType,
    activePanel,
    isContextPanelOpen,
    setTheme,
    toggleTheme,
    toggleFullscreen,
    toggleDrawingMode,
    requestScreenshot,
    requestLineTool,
    setActivePanel,
    closePanel,
  }
})
