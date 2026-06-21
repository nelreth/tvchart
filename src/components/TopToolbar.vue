<template>
  <header class="top-toolbar">
    <!-- ── LEWA STRONA: ticker ── -->
    <div class="toolbar-left">
      <button class="ticker-btn" @click="isModalOpen = true" title="Zmień ticker">
        <span class="ticker-label">{{ marketStore.activeTicker }}</span>
        <span class="ticker-arrow">▾</span>
      </button>
      <!-- FLAG: kategoria koloru aktywnego tickera (hover = menu kolorów) -->
      <div
        class="flag-wrapper"
        @mouseenter="flagOpen = true"
        @mouseleave="flagOpen = false"
      >
        <button
          class="flag-btn"
          :title="activeColorHex ? 'Zmień kolor' : 'Przypisz kolor'"
        >
          <span
            class="flag-dot"
            :style="activeColorHex ? { background: activeColorHex } : {}"
            :class="{ 'flag-dot-empty': !activeColorHex }"
          />
        </button>
        <div v-if="flagOpen && watchlistStore.colors.length" class="color-menu">
          <button
            v-for="color in watchlistStore.colors"
            :key="color.id"
            class="color-opt"
            :class="{ 'color-opt-active': activeColorId === color.id }"
            :title="color.name"
            @click="handleColorToggle(color.id)"
          >
            <span class="color-opt-dot" :style="{ background: color.hex_code }" />
            <span v-if="activeColorId === color.id" class="color-opt-check">&#10003;</span>
          </button>
          <button
            v-if="activeColorId"
            class="color-opt color-opt-remove"
            title="Usuń kolor"
            @click="handleColorToggle(null)"
          >
            <span class="color-opt-x">&times;</span>
          </button>
        </div>
      </div>

      <!-- PLUS: dodaj aktywny ticker do listy nazwanej -->
      <div class="plus-wrapper">
        <button
          class="toolbar-btn plus-btn"
          title="Dodaj do watchlisty"
          @click.stop="togglePlusMenu"
        >+</button>
        <div v-if="plusMenuOpen" class="named-menu" @click.stop>
          <template v-if="!creatingNew">
            <div
              v-for="wl in namedLists"
              :key="wl.id"
              class="named-opt"
              @click="handleAddToNamed(wl.id)"
            >
              <span class="named-check">{{ tickerInWl(wl.id) ? '&#10003;' : '&nbsp;' }}</span>
              <span class="named-label">{{ wl.name }}</span>
            </div>
            <div v-if="namedLists.length === 0" class="named-opt named-opt-empty">Brak list</div>
            <div class="named-opt named-opt-create" @click="startCreate">+ Utwórz nową listę…</div>
          </template>
          <template v-else>
            <div class="create-form">
              <input
                ref="newNameRef"
                v-model="newListName"
                class="create-input"
                placeholder="Nazwa listy…"
                maxlength="50"
                @keydown.enter.stop="confirmCreate"
                @keydown.esc.stop="creatingNew = false"
              />
              <button class="create-ok" :disabled="!newListName.trim()" @click.stop="confirmCreate">OK</button>
              <button class="create-cancel" @click.stop="creatingNew = false">&times;</button>
            </div>
          </template>
        </div>
      </div>
      <button
        class="toolbar-btn draw-btn"
        title="Rysuj linię trendu"
        @click="appStore.requestLineTool('TrendLine')"
      >╱</button>
    </div>

    <!-- ── PRAWA STRONA: akcje ── -->
    <div class="toolbar-right">
      <button
        class="toolbar-btn"
        :class="{ 'toolbar-btn-active': appStore.drawingMode }"
        @click="appStore.toggleDrawingMode()"
        title="Rysuj linię (kliknij 2 punkty, Esc aby wyjść)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="2" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="2" r="1.5" fill="currentColor"/>
        </svg>
      </button>
      <button class="toolbar-btn" @click="appStore.toggleTheme()" :title="themeLabel">
        <span>{{ appStore.theme === 'dark' ? '☀' : '🌙' }}</span>
      </button>
      <button class="toolbar-btn" @click="appStore.toggleFullscreen()" title="Pełny ekran">
        <span>{{ appStore.isFullscreen ? '⊡' : '⛶' }}</span>
      </button>
      <button class="toolbar-btn" @click="appStore.requestScreenshot()" title="Screenshot (PNG)">
        <span>⬡</span>
      </button>
    </div>
  </header>

  <!-- Modal wyboru tickera (teleportowany do <body>) -->
  <TickerModal
    v-if="isModalOpen"
    :current-ticker="marketStore.activeTicker"
    @close="isModalOpen = false"
    @select="handleTickerSelect"
  />
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore }       from '@/stores/appStore.js'
import { useMarketStore }    from '@/stores/marketStore.js'
import { useWatchlistStore } from '@/stores/watchlistStore.js'
import TickerModal           from '@/components/TickerModal.vue'

const appStore       = useAppStore()
const marketStore    = useMarketStore()
const watchlistStore = useWatchlistStore()
const isModalOpen    = ref(false)

// ── Globalne skróty klawiszowe ────────────────────────────────
function onGlobalKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
    console.log('Open ticker modal')
    e.preventDefault()
    isModalOpen.value = true
  }
}
onMounted(() => {
  window.addEventListener('keydown', onGlobalKey, true)
  watchlistStore.init()   // async, nieblokujące
})
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey, true))

// ── Motyw ─────────────────────────────────────────────────────
const themeLabel = computed(() =>
  appStore.theme === 'dark' ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'
)

// ── Ticker modal ──────────────────────────────────────────────
function handleTickerSelect(ticker) {
  isModalOpen.value = false
  marketStore.setTicker(ticker)
}

// ── Flaga koloru ──────────────────────────────────────────────
const flagOpen = ref(false)

const activeColorId = computed(() =>
  watchlistStore.activeColorId(marketStore.activeTicker)
)
const activeColorHex = computed(() => {
  const cid = activeColorId.value
  return cid ? (watchlistStore.colorById(cid)?.hex_code ?? null) : null
})

async function handleColorToggle(colorId) {
  const ticker = marketStore.activeTicker
  if (colorId === null) {
    if (activeColorId.value) await watchlistStore.toggleColor(ticker, activeColorId.value)
  } else {
    await watchlistStore.toggleColor(ticker, colorId)
  }
}

// ── Menu "+" (listy nazwane) ──────────────────────────────────
const plusMenuOpen = ref(false)
const creatingNew  = ref(false)
const newListName  = ref('')
const newNameRef   = ref(null)
const namedLists   = computed(() => watchlistStore.namedLists)

function tickerInWl(wid) {
  return watchlistStore.tickerInWatchlist(wid, marketStore.activeTicker)
}
function togglePlusMenu() {
  if (plusMenuOpen.value) { closePlusMenu(); return }
  plusMenuOpen.value = true
  nextTick(() => document.addEventListener('click', closePlusMenu, { once: true }))
}
function closePlusMenu() {
  plusMenuOpen.value = false
  creatingNew.value  = false
  newListName.value  = ''
}
function startCreate() {
  creatingNew.value = true
  nextTick(() => newNameRef.value?.focus())
}
async function handleAddToNamed(wid) {
  await watchlistStore.addToNamed(wid, marketStore.activeTicker)
  closePlusMenu()
}
async function confirmCreate() {
  const name = newListName.value.trim()
  if (!name) return
  const wl = await watchlistStore.createNamed(name)
  await watchlistStore.addToNamed(wl.id, marketStore.activeTicker)
  closePlusMenu()
}
</script>

<style scoped>
.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 10px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 8px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── Ticker button ── */
.ticker-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--bg-btn);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.03em;
  transition: background 0.15s, border-color 0.15s;
}
.ticker-btn:hover {
  background: var(--bg-btn-hover);
  border-color: var(--accent);
}
.ticker-arrow {
  font-size: 10px;
  color: var(--accent);
}

/* ── Action buttons ── */
.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  border-radius: 4px;
  background: var(--bg-btn);
  border: 1px solid transparent;
  color: var(--text-secondary);
  font-size: 15px;
  transition: background 0.15s, color 0.15s;
}
.toolbar-btn-active,
.toolbar-btn-active:hover {
  background: var(--accent) !important;
  color: var(--text-on-accent) !important;
}
.toolbar-btn:hover {
  background: var(--bg-btn-hover);
  border-color: var(--border);
  color: var(--text-primary);
}

/* ── Flaga koloru ──────────────────────────────── */
.flag-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.flag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  transition: background 0.15s;
}
.flag-btn:hover { background: var(--bg-hover); }
.flag-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: block;
}
.flag-dot-empty {
  border: 1.5px dashed var(--text-muted);
  background: transparent !important;
}
.color-menu {
  position: absolute;
  top: 100%;
  padding-top: 4px;
  left: 0;
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 24px var(--shadow-medium);
  z-index: 200;
}
.color-opt {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
}
.color-opt:hover { transform: scale(1.2); }
.color-opt-active {
  box-shadow: 0 0 0 2px var(--bg-elevated), 0 0 0 3.5px var(--text-on-accent);
}
.color-opt-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: block;
  pointer-events: none;
}
.color-opt-check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: var(--text-on-accent);
  pointer-events: none;
  text-shadow: 0 0 3px var(--shadow-strong);
}
.color-opt-remove { background: var(--bg-hover); border-radius: 4px !important; }
.color-opt-x { font-size: 14px; color: var(--text-secondary); line-height: 1; }

/* ── Menu + (listy nazwane) ───────────────────── */
.plus-wrapper { position: relative; }
.plus-btn {
  font-size: 17px !important;
  color: var(--accent) !important;
  font-weight: 400 !important;
}
.draw-btn {
  margin-left: 60px; /* ok. 2 szerokości standardowego przycisku (2 x 30px) */
  font-size: 16px;
}
.named-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 190px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 24px var(--shadow-medium);
  z-index: 200;
  overflow: hidden;
}
.named-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-primary);
  transition: background 0.1s;
}
.named-opt:hover { background: var(--bg-hover); }
.named-check { width: 14px; font-size: 12px; color: var(--accent); flex-shrink: 0; }
.named-label { flex: 1; }
.named-opt-empty { color: var(--text-muted); cursor: default; font-style: italic; }
.named-opt-empty:hover { background: none; }
.named-opt-create { color: var(--accent); font-weight: 500; border-top: 1px solid var(--border); }
.create-form {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
}
.create-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  font-family: inherit;
}
.create-input:focus { border-color: var(--border-focus); }
.create-ok, .create-cancel {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.create-ok { background: var(--accent); border-color: var(--accent); color: var(--text-on-accent); }
.create-ok:hover:not(:disabled) { background: var(--accent-hover); }
.create-ok:disabled { opacity: 0.4; cursor: not-allowed; }
.create-cancel { background: var(--bg-btn); color: var(--text-secondary); }
.create-cancel:hover { background: var(--bg-btn-hover); }
</style>
