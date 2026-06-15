<template>
  <div class="watchlist-panel">

    <!-- Stan ładowania / błąd -->
    <div v-if="store.error" class="wl-state wl-error">
      <span>Błąd: {{ store.error }}</span>
    </div>
    <div v-else-if="!store.isLoaded" class="wl-state">
      <span>Ładowanie…</span>
    </div>

    <template v-else>
      <!-- ── Kategorie kolorów ── -->
      <section v-if="colorLists.length" class="wl-section">
        <div class="wl-section-hdr">Kategorie kolorów</div>
        <div v-for="wl in colorLists" :key="wl.id" class="wl-group">
          <div class="wl-grp-hdr" @click="toggleCollapse(wl.id)">
            <span class="wl-chevron">{{ collapsed.has(wl.id) ? '▸' : '▾' }}</span>
            <span class="wl-grp-dot" :style="{ background: colorHex(wl) }" />
            <span class="wl-grp-name">{{ colorLabel(wl) }}</span>
            <span class="wl-grp-cnt">{{ (store.items[wl.id] || []).length }}</span>
          </div>
          <div v-if="!collapsed.has(wl.id)" class="wl-items">
            <div
              v-for="item in (store.items[wl.id] || [])"
              :key="item.ticker"
              class="wl-item"
            >
              <span
                class="wl-ticker"
                :class="{ 'wl-ticker-active': item.ticker === marketStore.activeTicker }"
                @click="marketStore.setTicker(item.ticker)"
              >{{ item.ticker }}</span>
              <button
                class="wl-rm"
                title="Usuń z listy"
                @click.stop="store.removeFrom(wl.id, item.ticker)"
              >×</button>
            </div>
            <span v-if="!(store.items[wl.id] || []).length" class="wl-empty-row">—</span>
          </div>
        </div>
      </section>

      <!-- ── Listy nazwane ── -->
      <section class="wl-section">
        <div class="wl-section-hdr">Listy nazwane</div>
        <div v-if="namedLists.length === 0" class="wl-hint">
          Użyj <strong>＋</strong> w pasku narzędzi, aby dodać listę.
        </div>
        <div v-for="wl in namedLists" :key="wl.id" class="wl-group">
          <div class="wl-grp-hdr" @click="toggleCollapse(wl.id)">
            <span class="wl-chevron">{{ collapsed.has(wl.id) ? '▸' : '▾' }}</span>
            <span class="wl-grp-name">{{ wl.name }}</span>
            <span class="wl-grp-cnt">{{ (store.items[wl.id] || []).length }}</span>
          </div>
          <div v-if="!collapsed.has(wl.id)" class="wl-items">
            <div
              v-for="item in (store.items[wl.id] || [])"
              :key="item.ticker"
              class="wl-item"
            >
              <span
                class="wl-color-dot"
                :class="{ 'wl-color-dot-none': !tickerColorHex(item.ticker) }"
                :style="tickerColorHex(item.ticker) ? { background: tickerColorHex(item.ticker) } : {}"
              />
              <span
                class="wl-ticker"
                :class="{ 'wl-ticker-active': item.ticker === marketStore.activeTicker }"
                @click="marketStore.setTicker(item.ticker)"
              >{{ item.ticker }}</span>
              <button
                class="wl-rm"
                title="Usuń z listy"
                @click.stop="store.removeFrom(wl.id, item.ticker)"
              >×</button>
            </div>
            <span v-if="!(store.items[wl.id] || []).length" class="wl-empty-row">—</span>
          </div>
        </div>
      </section>
    </template>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useWatchlistStore } from '@/stores/watchlistStore.js'
import { useMarketStore }    from '@/stores/marketStore.js'

const store       = useWatchlistStore()
const marketStore = useMarketStore()

const colorLists = computed(() => store.colorLists)
const namedLists = computed(() => store.namedLists)

const collapsed = ref(new Set())
function toggleCollapse(id) {
  const s = new Set(collapsed.value)
  s.has(id) ? s.delete(id) : s.add(id)
  collapsed.value = s
}

onMounted(async () => {
  await store.init()         // no-op jeśli już załadowano
  await store.loadAllItems() // uzupełnia items dla list nazwanych
})

function colorHex(wl) {
  return store.colorById(wl.color_id)?.hex_code || '#888888'
}

function colorLabel(wl) {
  return store.colorById(wl.color_id)?.name || wl.name
}

function tickerColorHex(ticker) {
  const cid = store.activeColorId(ticker)
  return cid ? (store.colorById(cid)?.hex_code ?? null) : null
}
</script>

<style scoped>
.watchlist-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  font-size: 12px;
}

/* Stan ładowania / błąd */
.wl-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--text-muted);
}
.wl-error { color: #ef5350; }

/* Sekcje */
.wl-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.wl-section:last-child { border-bottom: none; }

.wl-section-hdr {
  padding: 4px 12px 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Grupy (1 watchlista) */
.wl-group { margin-bottom: 6px; }

.wl-grp-hdr {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  cursor: pointer;
  user-select: none;
  border-radius: 3px;
}
.wl-grp-hdr:hover { background: var(--bg-hover); }

.wl-chevron {
  font-size: 9px;
  color: var(--text-muted);
  width: 10px;
  flex-shrink: 0;
  line-height: 1;
}

.wl-grp-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.wl-grp-icon {
  width: 10px;
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.wl-grp-name {
  flex: 1;
  font-weight: 600;
  color: var(--text-primary);
}
.wl-grp-cnt {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-hover);
  border-radius: 8px;
  padding: 1px 5px;
}

/* Elementy (tickery) */
.wl-items {
  padding: 0 12px 4px 28px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.wl-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 0;
  border-radius: 3px;
}
.wl-item:hover .wl-rm { opacity: 1; }

.wl-color-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 4px;
}
.wl-color-dot-none { visibility: hidden; }

.wl-ticker {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 1px 4px;
  border-radius: 3px;
  transition: color 0.1s, background 0.1s;
}
.wl-ticker:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}
.wl-ticker-active {
  color: var(--accent) !important;
}

.wl-rm {
  opacity: 0;
  font-size: 13px;
  color: var(--text-muted);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.wl-rm:hover {
  background: var(--bg-hover);
  color: #ef5350;
}

.wl-empty-row {
  color: var(--text-muted);
  font-size: 11px;
  padding: 2px 0;
}

/* Wskazówka */
.wl-hint {
  padding: 6px 12px 8px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}
</style>
