<template>
  <aside class="context-panel" :style="{ width: panelWidth + 'px' }" @keydown.esc="appStore.closePanel()">
    <div class="panel-resize-handle" @mousedown.prevent="startResize" />
    <div class="panel-header">
      <span class="panel-title">{{ panelTitle }}</span>
      <button class="panel-close" @click="appStore.closePanel()" title="Zamknij panel">✕</button>
    </div>
    <div class="panel-body">
      <component v-if="currentPanel" :is="currentPanel" />
      <div v-else class="panel-placeholder">
        <span>{{ panelTitle }}</span>
        <p>Panel będzie dostępny wkrótce.</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAppStore }      from '@/stores/appStore.js'
import WatchlistPanel      from '@/components/WatchlistPanel.vue'
import SearchPanel         from '@/components/SearchPanel.vue'
import ScannersPanel       from '@/components/ScannersPanel.vue'
import FundamentalsPanel   from '@/components/FundamentalsPanel.vue'

const appStore = useAppStore()

const panelWidth = ref(300)

function startResize(e) {
  const startX = e.clientX
  const startWidth = panelWidth.value

  function onMouseMove(ev) {
    const delta = startX - ev.clientX
    panelWidth.value = Math.max(180, Math.min(700, startWidth + delta))
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const PANEL_LABELS = {
  watchlist:    'Watchlists',
  search:       'Search',
  scanners:     'Scanners',
  fundamentals: 'Fundamentals',
}

const panelTitle = computed(() => PANEL_LABELS[appStore.activePanel] || '')

const PANEL_COMPONENTS = {
  watchlist:    WatchlistPanel,
  search:       SearchPanel,
  scanners:     ScannersPanel,
  fundamentals: FundamentalsPanel,
}
const currentPanel = computed(() => PANEL_COMPONENTS[appStore.activePanel] ?? null)
</script>

<style scoped>
.context-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-panel);
  border-left: 1px solid var(--border);
  overflow: hidden;
  position: relative;
}

.panel-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  z-index: 10;
}

.panel-resize-handle:hover {
  background: var(--accent, #4fc3f7);
  opacity: 0.4;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.panel-close {
  font-size: 14px;
  color: var(--text-muted);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background 0.15s, color 0.15s;
}
.panel-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
}

.panel-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 40px;
  color: var(--text-muted);
  text-align: center;
}
.panel-placeholder span {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}
.panel-placeholder p {
  font-size: 12px;
}
</style>
