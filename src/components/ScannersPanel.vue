<template>
  <div class="scanners-panel">

    <!-- Błąd / ładowanie -->
    <div v-if="store.error" class="sc-state sc-error">Błąd: {{ store.error }}</div>
    <div v-else-if="!store.isLoaded" class="sc-state">Ładowanie…</div>

    <template v-else>
      <div v-if="store.scanners.length === 0" class="sc-state sc-empty">
        Brak zdefiniowanych skanerów.
      </div>

      <!-- Lista skanerów -->
      <div
        v-for="sc in store.scanners"
        :key="sc.id"
        class="sc-item"
        :class="{ 'sc-item-open': store.expandedId === sc.id }"
      >
        <!-- Nagłówek skanera (klik = rozwiń/zwiń) -->
        <div class="sc-header" @click="store.toggleExpand(sc.id)">
          <span class="sc-chevron">{{ store.expandedId === sc.id ? '▾' : '▸' }}</span>
          <div class="sc-header-text">
            <span class="sc-name">{{ sc.name }}</span>
            <span class="sc-meta">
              <span v-if="sc.last_run_at" class="sc-date">{{ formatDate(sc.last_run_at) }}</span>
              <span v-else class="sc-date sc-never">nigdy nie uruchomiony</span>
              <span v-if="sc.result_count != null" class="sc-count">{{ sc.result_count }} wyników</span>
            </span>
          </div>
          <span
            v-if="sc.last_status"
            class="sc-status"
            :class="`sc-status-${sc.last_status}`"
          >{{ sc.last_status }}</span>
          <button
            class="sc-delete-btn"
            title="Usuń skaner"
            @click.stop="confirmDelete(sc.id)"
          >✕</button>
        </div>

        <!-- Wyniki (po rozwinięciu) -->
        <div v-if="store.expandedId === sc.id" class="sc-results">

          <!-- Ładowanie wyników -->
          <div v-if="store.isLoadingResults && store.activeResults === null" class="sc-results-loading">
            Ładowanie wyników…
          </div>

          <!-- Wyniki załadowane -->
          <template v-else-if="store.activeResults !== null">
            <div v-if="store.activeResults.length === 0" class="sc-no-results">
              Brak wyników dla tego skanera.
            </div>

            <div v-else class="sc-results-wrap">
              <!-- Nagłówek kolumn -->
              <div class="sc-row sc-row-hdr">
                <span class="sc-col-rank">#</span>
                <span class="sc-col-ticker">Ticker</span>
                <span
                  v-for="col in valueColumns"
                  :key="col"
                  class="sc-col-val"
                >{{ col }}</span>
              </div>

              <!-- Wiersze wyników -->
              <div
                v-for="(row, idx) in store.activeResults"
                :key="row.ticker + idx"
                class="sc-row sc-row-data"
                :class="{ 'sc-row-active': row.ticker === marketStore.activeTicker }"
                @click="panelStore.setActiveTicker(row.ticker)"
              >
                <span class="sc-col-rank">{{ row.rank ?? idx + 1 }}</span>
                <span class="sc-col-ticker sc-ticker">{{ row.ticker }}</span>
                <span
                  v-for="col in valueColumns"
                  :key="col"
                  class="sc-col-val"
                >{{ formatVal(row[col]) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useScannerStore } from '@/stores/scannerStore.js'
import { useMarketStore }  from '@/stores/marketStore.js'
import { usePanelStore }   from '@/stores/panelStore.js'

const store       = useScannerStore()
const marketStore = useMarketStore()
const panelStore  = usePanelStore()
const deletingId  = ref(null)

onMounted(() => store.init())

// Wykryj kolumny wartości (wszystko poza polami systemowymi i ticker/rank)
const EXCLUDE_COLS = new Set(['ticker', 'rank', 'id', 'run_id', 'scanner_id', 'run_timestamp', 'added_at', 'matched_criteria'])

const valueColumns = computed(() => {
  const rows = store.activeResults
  if (!rows?.length) return []
  return Object.keys(rows[0]).filter(k => !EXCLUDE_COLS.has(k))
})

function confirmDelete(scannerId) {
  const scanner = store.scanners.find(s => s.id === scannerId)
  if (!scanner) return
  if (confirm(`Czy na pewno chcesz usunąć skaner "${scanner.name}"?`)) {
    handleDelete(scannerId)
  }
}

async function handleDelete(scannerId) {
  deletingId.value = scannerId
  try {
    await store.deleteScanner(scannerId)
  } finally {
    deletingId.value = null
  }
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatVal(v) {
  if (v == null) return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? v : v.toFixed(2)
  return v
}
</script>

<style scoped>
.scanners-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  font-size: 12px;
}

/* Stan ładowania / błąd */
.sc-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--text-muted);
}
.sc-error  { color: var(--status-error); }
.sc-empty  { font-style: italic; }

/* Element skanera */
.sc-item {
  border-bottom: 1px solid var(--border);
}
.sc-item:last-child { border-bottom: none; }

/* Nagłówek skanera */
.sc-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 9px 12px;
  cursor: pointer;
  transition: background 0.12s;
  user-select: none;
}
.sc-header:hover    { background: var(--bg-hover); }
.sc-item-open .sc-header { background: var(--bg-hover); }

.sc-chevron {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
  flex-shrink: 0;
  width: 10px;
}
.sc-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sc-name {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sc-date  { color: var(--text-muted); font-size: 11px; }
.sc-never { font-style: italic; }
.sc-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-hover);
  border-radius: 8px;
  padding: 1px 5px;
}

/* Status badge */
.sc-status {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  align-self: center;
}
.sc-status-completed { background: var(--status-success-bg); color: var(--status-success); }
.sc-status-failed    { background: var(--status-failed-bg); color: var(--status-error); }
.sc-status-pending   { background: var(--status-warning-bg); color: var(--status-warning); }

/* Przycisk usuwania */
.sc-delete-btn {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: var(--status-error-bg);
  color: var(--status-error);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background 0.1s, color 0.1s;
}
.sc-delete-btn:hover {
  background: rgba(239, 83, 80, 0.15);
  color: #ef5350;
}

/* Sekcja wyników */
.sc-results {
  background: var(--bg-primary);
  border-top: 1px solid var(--border);
}
.sc-results-loading,
.sc-no-results {
  padding: 12px 16px;
  color: var(--text-muted);
  font-style: italic;
  font-size: 11px;
}

/* Tabela wyników */
.sc-results-wrap { overflow-x: auto; }

.sc-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  min-width: 0;
}
.sc-row-hdr {
  border-bottom: 1px solid var(--border);
  padding-top: 6px;
  padding-bottom: 5px;
}
.sc-row-hdr span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.sc-row-data {
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.1s;
}
.sc-row-data:hover  { background: var(--bg-hover); }
.sc-row-active .sc-ticker { color: var(--accent); }

.sc-col-rank   { width: 22px; flex-shrink: 0; color: var(--text-muted); font-size: 11px; }
.sc-col-ticker { width: 62px; flex-shrink: 0; font-weight: 600; color: var(--text-secondary); }
.sc-ticker     { color: var(--text-secondary); transition: color 0.1s; }
.sc-row-data:hover .sc-ticker { color: var(--text-primary); }
.sc-col-val    { flex: 1; text-align: right; color: var(--text-secondary); font-size: 11px; min-width: 48px; }
</style>
