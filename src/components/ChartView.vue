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
let legend = null
let legendInfo = {
  name: '',
  exchange: '',
  adr20: 0,
  open: 0,
  high: 0,
  low: 0,
  close: 0,
  volume: 0,
}

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

// ── Legenda ────────────────────────────────────────────────────
function createLegend(container) {
  legend = document.createElement('div')
  legend.style.cssText = `
    position: absolute;
    left: 12px;
    top: 12px;
    z-index: 10;
    font-size: 12px;
    line-height: 18px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: rgba(255, 255, 255, 0.8);
    color: #7b7c80;
    padding: 8px 12px;
    border-radius: 4px;
    pointer-events: none;
  `
  container.appendChild(legend)
  updateLegend()
}

function updateLegend() {
  if (!legend) return
  const { name, exchange, adr20, open, high, low, close, volume } = legendInfo
  const ticker = marketStore.activeTicker
  const nameStr = name ? `${name}` : ticker
  const exchangeStr = exchange ? ` - ${exchange}` : ''
  const adrStr = adr20 > 0 ? `- ADR%20: <span style="color: red">${adr20.toFixed(2)}%</span>` : ''
  const volStr = volume > 0 ? `Vol: ${formatVolume(volume)}` : 'Vol: —'
  legend.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">${nameStr}${exchangeStr} ${adrStr}</div>
    <div>O: ${open.toFixed(2)} H: ${high.toFixed(2)} L: ${low.toFixed(2)} C: ${close.toFixed(2)} ${volStr}</div>
  `
}

function formatVolume(vol) {
  if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M'
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K'
  return vol.toString()
}

function calculateADR20(candles) {
  if (!candles || candles.length < 20) return 0
  
  // Pobieramy dokładnie ostatnich 20 świeczek
  const last20 = candles.slice(-20)
  
  let sumRatios = 0
  
  // 1. Dla każdego dnia liczymy stosunek High do Low i sumujemy
  for (let i = 0; i < last20.length; i++) {
    const candle = last20[i]
    
    // Zabezpieczenie na wypadek gdyby low wynosiło 0 (np. błąd danych)
    if (candle.low > 0) {
      sumRatios += (candle.high / candle.low)
    } else {
      sumRatios += 1 // Jeśli low to 0, traktujemy to jako brak zmiany (stosunek 1:1)
    }
  }
  
  // 2. Obliczamy średnią arytmetyczną z tych stosunków (odpowiednik sma w Pine Script)
  const smaHighLowRatio = sumRatios / 20
  
  // 3. Odpowiednik formuły z TradingView: 100 * (sma - 1)
  const adrPineStyle = (smaHighLowRatio - 1) * 100
  
  return adrPineStyle
}

async function loadCompanyInfo(ticker) {
  try {
    const response = await fetch(`http://localhost:6070/tickers?search=${ticker}`)
    if (response.ok) {
      const data = await response.json()
      const company = data.find(c => c.ticker === ticker.toUpperCase())
      if (company) {
        legendInfo.name = company.name || ''
        legendInfo.exchange = company.exchange || ''
      }
    }
  } catch (e) {
    console.error('Error loading company info:', e)
  }
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

  // Legenda
  createLegend(chartContainerRef.value)
  await loadCompanyInfo(marketStore.activeTicker)

  // Obsługa crosshair – aktualizacja legendy
  chart.subscribeCrosshairMove((param) => {
    if (!param.time) {
      updateLegend()
      return
    }
    const data = param.seriesData.get(mainSeries)
    if (data) {
      legendInfo.open = data.open || 0
      legendInfo.high = data.high || 0
      legendInfo.low = data.low || 0
      legendInfo.close = data.close || 0

      // Pobierz volume z candles array bezpośrednio
      const candle = marketStore.candles.find(c => c.time === param.time)
      legendInfo.volume = candle?.volume || 0
      updateLegend()
    }
  })

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
  legend?.remove()
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

    // Aktualizuj legendę z ostatnim słupkiem
    if (marketStore.candles.length > 0) {
      const lastCandle = marketStore.candles[marketStore.candles.length - 1]
      legendInfo.open = lastCandle.open
      legendInfo.high = lastCandle.high
      legendInfo.low = lastCandle.low
      legendInfo.close = lastCandle.close
      legendInfo.volume = lastCandle.volume
      legendInfo.adr20 = calculateADR20(marketStore.candles)
      updateLegend()
    }
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
  async (ticker) => {
    createWatermark()
    await loadCompanyInfo(ticker)
    legendInfo.open = 0
    legendInfo.high = 0
    legendInfo.low = 0
    legendInfo.close = 0
    legendInfo.volume = 0
    legendInfo.adr20 = 0
    updateLegend()
  }
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

.test123 {
  color: red;
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
