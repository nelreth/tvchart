<template>
  <div class="chart-wrapper" ref="wrapperRef" :class="{ 'drawing-mode': appStore.drawingMode }">
    <!-- Loading overlay -->
    <div v-if="marketStore.isLoadingChart && marketStore.candles.length === 0" class="chart-overlay">
      <span>Ładowanie danych…</span>
    </div>

    <!-- Error overlay -->
    <div v-if="marketStore.error" class="chart-overlay chart-error">
      <span>{{ marketStore.error }}</span>
      <button @click="marketStore.loadInitialPrices()">Spróbuj ponownie</button>
    </div>

    <!-- Loading indicator (dokładanie historii) -->
    <div v-if="marketStore.isLoadingChart && marketStore.candles.length > 0" class="chart-loading-bar" />

    <!-- Kontener wykresu -->
    <div ref="chartContainerRef" class="chart-container" />

    <!-- Wskazówka trybu rysowania -->
    <div v-if="appStore.drawingMode" class="drawing-hint">
      {{ drawingPointA ? 'Kliknij punkt B — lub Esc aby anulować' : 'Kliknij punkt A na wykresie' }}
    </div>
  </div>
</template>

<script setup>
import {
  ref, watch, onMounted, onBeforeUnmount,
} from 'vue'
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, ColorType, createTextWatermark } from 'lightweight-charts'
import { createLineToolsPlugin } from 'lightweight-charts-line-tools-core';
import { registerLinesPlugin } from 'lightweight-charts-line-tools-lines'
import { useMarketStore } from '@/stores/marketStore.js'
import { useAppStore }    from '@/stores/appStore.js'

const marketStore      = useMarketStore()
const appStore         = useAppStore()
const wrapperRef       = ref(null)
const chartContainerRef = ref(null)
const theme_dark = appStore.theme === 'dark'
let upCandleColor       = theme_dark ? '#d0d4dc' : '#668797'

const LINE_TOOLS_STORAGE_KEY = 'tv.lineToolsByTicker.v1'

let chart       = null
let mainSeries  = null
let ma10Series  = null
let ma20Series  = null
let ma50Series  = null
let volSeries   = null
let lineTools   = null
let resizeObs   = null
let drawingLines = []
let textWatermark = null

const drawingPointA = ref(null)

let isRestoringLineTools = false

function readLineToolsStorage() {
  try {
    const raw = localStorage.getItem(LINE_TOOLS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLineToolsStorage(data) {
  localStorage.setItem(LINE_TOOLS_STORAGE_KEY, JSON.stringify(data))
}

function saveLineToolsForTicker(ticker) {
  if (!lineTools || !ticker) return
  const map = readLineToolsStorage()
  const serialized = lineTools.exportLineTools()

  if (serialized === '[]') {
    delete map[ticker]
  } else {
    map[ticker] = serialized
  }

  writeLineToolsStorage(map)
}

function restoreLineToolsForTicker(ticker) {
  if (!lineTools) return

  const map = readLineToolsStorage()
  const serialized = map[ticker]

  isRestoringLineTools = true
  try {
    lineTools.removeAllLineTools()
    if (serialized) {
      lineTools.importLineTools(serialized)
    }
  } finally {
    isRestoringLineTools = false
  }
}

function onLineToolsAfterEdit() {
  if (isRestoringLineTools) return
  saveLineToolsForTicker(marketStore.activeTicker)
}


function onChartDeleteKey(e) {
  if (e.key !== 'Delete') return
  if (!lineTools) return

  const target = e.target
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  ) {
    return
  }

  lineTools.removeSelectedLineTools()
  saveLineToolsForTicker(marketStore.activeTicker)
}

// ── Watermark ──────────────────────────────────────────────────
function createWatermark() {
  if (!chart) return
  if (textWatermark) textWatermark.detach()
  const color = appStore.theme === 'dark' ? 'rgba(155, 125, 255, 0.3)' : 'rgba(202, 202, 202, 0.3)'
  textWatermark = createTextWatermark(chart.panes()[0], {
    horzAlign: 'center',
    vertAlign: 'center',
    lines: [
      {
        text: marketStore.activeTicker,
        color,
        fontSize: 140,
      },
    ],
  })
}

// ── Opcje wyglądu wykresu per motyw ──────────────────────────────
function getChartTheme(theme) {
  const dark = theme === 'dark'
  return {
    layout: {
      background: { type: ColorType.Solid, color: dark ? '#1a1a2e' : '#ffffff' },
      textColor:  dark ? '#d1d4dc' : '#1e2026',
      panes: { 
        separatorColor: '#f22c3d',
        separatorHoverColor: 'rgba(255, 0, 0, 0.1)',
        enableResize: true,
        height: 30,
      },
    },
    grid: {
      vertLines: { color: dark ? '#2a2a4e' : '#e2e4e9' },
      horzLines: { color: dark ? '#2a2a4e' : '#e2e4e9' },
    },
    crosshair: {
      vertLine: { color: dark ? '#9B7DFF' : '#6930C3', labelBackgroundColor: dark ? '#9B7DFF' : '#6930C3' },
      horzLine: { color: dark ? '#9B7DFF' : '#6930C3', labelBackgroundColor: dark ? '#9B7DFF' : '#6930C3' },
    },
    rightPriceScale: { borderColor: dark ? '#2a2a4e' : '#e2e4e9' },
    timeScale:       { borderColor: dark ? '#2a2a4e' : '#e2e4e9', timeVisible: true, rightOffset: 50 },
  }
}

// ── Inicjalizacja wykresu ──────────────────────────────────────
onMounted(async () => {
  const container = chartContainerRef.value
  chart = createChart(container, {
    width:  container.clientWidth,
    height: container.clientHeight,
    ...getChartTheme(appStore.theme),
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale:  { mouseWheel: true, pinch: true },
  })

  mainSeries = chart.addSeries(CandlestickSeries, {
    upColor:        '#d0d4dc', downColor:       '#668797',
    borderUpColor:  '#000000', borderDownColor: '#000000',
    // borderUpColor:  '#26a69a', borderDownColor: '#ef5350',
    wickUpColor:    '#000000', wickDownColor:   '#000000',
    // wickUpColor:    '#26a69a', wickDownColor:   '#ef5350',
  })

  ma10Series = chart.addSeries(LineSeries, { color: '#228B22', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
  ma20Series = chart.addSeries(LineSeries, { color: '#D30000', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
  ma50Series = chart.addSeries(LineSeries, { color: '#A9AAA8', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })

  volSeries = chart.addSeries(HistogramSeries, {
    priceFormat:  { type: 'volume' },
    priceScaleId: 'volume',
  })
  volSeries.moveToPane(1)
  volSeries.priceScale().applyOptions({ scaleMargins: { top: 0, bottom: 0 } })
  chart.panes()[1].setHeight(100)

  lineTools = createLineToolsPlugin(chart, mainSeries)
  registerLinesPlugin(lineTools)
  lineTools.subscribeLineToolsAfterEdit(onLineToolsAfterEdit)

  // Lazy loading przy przewijaniu w lewo
  chart.timeScale().subscribeVisibleLogicalRangeChange(async (range) => {
    if (range && range.from < 10) {
      await marketStore.loadMoreHistory()
    }
  })

  // ResizeObserver – responsywny rozmiar
  resizeObs = new ResizeObserver(() => {
    if (chart && wrapperRef.value) {
      chart.applyOptions({
        width:  wrapperRef.value.clientWidth,
        height: wrapperRef.value.clientHeight,
      })
    }
  })
  resizeObs.observe(wrapperRef.value)

  // Pierwsze ładowanie danych
  await marketStore.loadInitialPrices()
  restoreLineToolsForTicker(marketStore.activeTicker)

  window.addEventListener('keydown', onChartDeleteKey, true)

  createWatermark()

  // Obsługa kliknięć do rysowania linii
  chart.subscribeClick((param) => {
    if (!appStore.drawingMode || !param.time || !param.point) return
    const price = mainSeries.coordinateToPrice(param.point.y)
    if (price == null) return
    const pt = { time: param.time, value: price }
    if (!drawingPointA.value) {
      drawingPointA.value = pt
    } else {
      const [a, b] = drawingPointA.value.time <= pt.time
        ? [drawingPointA.value, pt]
        : [pt, drawingPointA.value]
      const line = chart.addSeries(LineSeries, {
        color: '#FFD700',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      line.setData([a, b])
      drawingLines.push(line)
      drawingPointA.value = null
    }
  })

  // ESC: anuluj punkt A lub wyjść z trybu rysowania
  const onEsc = (e) => {
    if (e.key !== 'Escape') return
    if (drawingPointA.value) {
      drawingPointA.value = null
    } else if (appStore.drawingMode) {
      appStore.toggleDrawingMode()
    }
  }
  window.addEventListener('keydown', onEsc)
  onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))
})

onBeforeUnmount(() => {
  saveLineToolsForTicker(marketStore.activeTicker)
  lineTools?.unsubscribeLineToolsAfterEdit(onLineToolsAfterEdit)
  window.removeEventListener('keydown', onChartDeleteKey, true)
  resizeObs?.disconnect()
  lineTools = null
  textWatermark?.detach()
  drawingLines = []
  chart?.remove()
  chart = null
})

// Wyjście z trybu rysowania → reset punktu A
watch(
  () => appStore.drawingMode,
  (active) => { if (!active) drawingPointA.value = null }
)

// ── Aktualizacja danych po zmianie candles ────────────────────
watch(
  () => marketStore.candles,
  () => {
    if (!mainSeries) return
    mainSeries.setData(marketStore.candles)
    ma10Series.setData(marketStore.ma10)
    ma20Series.setData(marketStore.ma20)
    ma50Series.setData(marketStore.ma50)
    volSeries.setData(marketStore.volumeData)
  },
  { deep: false }
)

// ── Zmiana motywu wykresu ─────────────────────────────────────
watch(
  () => appStore.theme,
  (theme) => {
    chart?.applyOptions(getChartTheme(theme))
    createWatermark()
  }
)

// ── Zmiana tickera – aktualizuj watermark ──────────────────────
watch(
  () => marketStore.activeTicker,
  () => createWatermark()
)

// ── Screenshot ────────────────────────────────────────────────
watch(
  () => appStore.screenshotTrigger,
  (val) => {
    if (val > 0 && chart) {
      const canvas = chart.takeScreenshot()
      const url    = canvas.toDataURL('image/png')
      const a      = document.createElement('a')
      const date   = new Date().toISOString().slice(0, 10)
      a.href     = url
      a.download = `${marketStore.activeTicker}_${date}.png`
      a.click()
    }
  }
)

// ── Rysowanie linii ───────────────────────────────────────────
watch(
  () => appStore.lineToolTrigger,
  (val) => {
    if (val < 1 || !lineTools) return
    const toolType = appStore.pendingLineToolType || 'TrendLine'
    lineTools.addLineTool(toolType)
  }
)

watch(
  () => marketStore.activeTicker,
  (newTicker, oldTicker) => {
    if (!lineTools) return
    if (oldTicker) saveLineToolsForTicker(oldTicker)
    restoreLineToolsForTicker(newTicker)
  }
)

</script>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  z-index: 5;
}

.chart-error {
  color: #ef5350;
}

.chart-error button {
  padding: 6px 14px;
  background: var(--bg-btn);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
}
.chart-error button:hover {
  background: var(--bg-btn-hover);
}

.drawing-mode .chart-container { cursor: crosshair; }

.drawing-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}

.chart-loading-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  z-index: 6;
  animation: pulse-bar 1s ease-in-out infinite alternate;
}
@keyframes pulse-bar {
  from { opacity: 0.4; }
  to   { opacity: 1; }
}
</style>
