<template>
  <div class="chart-tabs">
    <!-- Pasek zakładek -->
    <div class="tabs-bar">
      <button
        v-for="tab in tabsStore.tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ 'tab-active': tab.id === tabsStore.activeTabId }"
        @click="tabsStore.switchTab(tab.id)"
      >
        <span class="tab-ticker">{{ tab.ticker || '—' }}</span>
        <span class="tab-spacer" />
        <span
          v-if="tabsStore.tabs.length > 1"
          class="tab-close"
          @click.stop="tabsStore.closeTab(tab.id)"
          title="Zamknij"
        >×</span>
      </button>
      <button class="tab-add" title="Nowy wykres" @click="tabsStore.addTab()">+</button>
    </div>

    <!-- Panele wykresów -->
    <div class="panels-row">
      <!-- Panel lewy / jedyny -->
      <div
        class="panel-wrapper"
        :class="{ 'panel-active': panelStore.splitMode && panelStore.activePanelId === 'primary' }"
        @pointerdown="panelStore.setActive('primary')"
      >
        <ChartView ref="primaryRef" storeKey="primary" />
      </div>

      <!-- Panel prawy (split mode) -->
      <div
        v-if="panelStore.splitMode"
        class="panel-wrapper"
        :class="{ 'panel-active': panelStore.activePanelId === 'secondary' }"
        @pointerdown="panelStore.setActive('secondary')"
      >
        <ChartView ref="secondaryRef" storeKey="secondary" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTabsStore }   from '@/stores/tabsStore.js'
import { useMarketStore } from '@/stores/marketStore.js'
import { usePanelStore }  from '@/stores/panelStore.js'
import ChartView          from '@/components/ChartView.vue'

const tabsStore   = useTabsStore()
const marketStore = useMarketStore()
const panelStore  = usePanelStore()

const primaryRef   = ref(null)
const secondaryRef = ref(null)

// ── Sync zakładek z aktywnym tickerem primaryStore ────────────
onMounted(() => { tabsStore.init() })
watch(() => marketStore.activeTicker, (ticker) => {
  tabsStore.syncActiveTicker(ticker)
})

</script>

<style scoped>
.chart-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* ── Pasek zakładek ─────────────────────────────── */
.tabs-bar {
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 0 6px;
  height: 32px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs-bar::-webkit-scrollbar { display: none; }

.tab-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  min-width: 100px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  border-radius: 4px 4px 0 0;
  margin-bottom: -1px;
}
.tab-item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}
.tab-active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
  background: var(--bg-primary);
}
.tab-ticker { letter-spacing: 0.03em; }
.tab-spacer { flex: 1; }

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  font-size: 13px;
  line-height: 1;
  color: var(--text-muted);
  transition: color 0.1s, background 0.1s;
  margin-left: 2px;
}
.tab-close:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: auto 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  font-size: 18px;
  font-weight: 300;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.tab-add:hover {
  color: var(--accent);
  background: var(--bg-hover);
}

/* ── Panele ──────────────────────────────────────── */
.panels-row {
  flex: 1;
  display: flex;
  min-height: 0;
  gap: 2px;
  background: var(--border);
}

.panel-wrapper {
  flex: 1;
  min-width: 0;
  position: relative;
  background: var(--bg-primary);
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition: outline-color 0.15s;
}

.panel-active {
  outline-color: var(--accent);
}
</style>
