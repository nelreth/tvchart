<template>
  <div class="fund-panel">

    <!-- Ticker header -->
    <div class="fund-ticker-hdr">
      <span class="fund-ticker-name">{{ marketStore.activeTicker }}</span>
      <span v-if="entry && entry !== 'not_found' && entry.fetched_at" class="fund-fetched">
        dane z {{ formatDate(entry.fetched_at) }}
      </span>
    </div>

    <!-- Stany -->
    <div v-if="store.isLoading" class="fund-state">Ładowanie…</div>
    <div v-else-if="store.error" class="fund-state fund-error">Błąd: {{ store.error }}</div>
    <div v-else-if="entry === null" class="fund-state fund-muted">—</div>
    <div v-else-if="entry === 'not_found'" class="fund-not-found">
      <p>Brak danych fundamentalnych dla <strong>{{ marketStore.activeTicker }}</strong>.</p>
      <p class="fund-hint">Uruchom skrypt importu fundamentals, aby zasilić bazę danych.</p>
    </div>

    <!-- Dane -->
    <div v-else-if="entry.data" class="fund-content">
      <template v-for="(val, key) in entry.data" :key="key">

        <!-- Sekcja zagnieżdżona (obiekt) -->
        <section v-if="isObj(val)" class="fund-section">
          <div class="fund-section-hdr">{{ fmtKey(key) }}</div>
          <div v-for="(v2, k2) in val" :key="k2" class="fund-row">
            <span class="fund-key">{{ fmtKey(k2) }}</span>
            <span class="fund-val" :class="colorClass(k2, v2)">{{ fmtVal(k2, v2) }}</span>
          </div>
        </section>

        <!-- Płaska wartość -->
        <div v-else class="fund-row fund-row-top">
          <span class="fund-key">{{ fmtKey(key) }}</span>
          <span class="fund-val" :class="colorClass(key, val)">{{ fmtVal(key, val) }}</span>
        </div>

      </template>
    </div>

  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue'
import { useFundamentalsStore } from '@/stores/fundamentalsStore.js'
import { useMarketStore }       from '@/stores/marketStore.js'

const store       = useFundamentalsStore()
const marketStore = useMarketStore()

const entry = computed(() => store.dataFor(marketStore.activeTicker))

// Załaduj dane przy mount i przy zmianie tickera
onMounted(() => store.load(marketStore.activeTicker))
watch(() => marketStore.activeTicker, (ticker) => store.load(ticker))

// ── Pomocniki ──────────────────────────────────────────────────
function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function fmtKey(k) {
  return String(k)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function fmtVal(key, val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean')  return val ? 'Tak' : 'Nie'
  if (Array.isArray(val))        return val.join(', ')
  if (isObj(val))                return JSON.stringify(val)

  if (typeof val === 'number') {
    const k = key.toLowerCase()
    const isPct = k.includes('pct') || k.includes('percent') || k.includes('yield')
               || k.includes('margin') || k.includes('growth') || k.includes('return')
    if (isPct) {
      // przyjmujemy że wartości < 5 są ułamkami dziesiętnym (np. 0.12 → 12.00%)
      const pct = Math.abs(val) < 5 ? val * 100 : val
      return pct.toFixed(2) + '%'
    }
    if (Math.abs(val) >= 1e12) return (val / 1e12).toFixed(2) + 'T'
    if (Math.abs(val) >= 1e9)  return (val / 1e9).toFixed(2) + 'B'
    if (Math.abs(val) >= 1e6)  return (val / 1e6).toFixed(2) + 'M'
    if (Math.abs(val) >= 1e3)  return val.toLocaleString('pl-PL')
    return Number.isInteger(val) ? String(val) : val.toFixed(2)
  }

  return String(val)
}

function colorClass(key, val) {
  if (typeof val !== 'number') return ''
  const k = key.toLowerCase()
  const isGrowth = k.includes('growth') || k.includes('change') || k.includes('return')
  if (!isGrowth) return ''
  return val >= 0 ? 'fund-positive' : 'fund-negative'
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.fund-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  font-size: 12px;
}

/* Ticker header */
.fund-ticker-hdr {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.fund-ticker-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.fund-fetched {
  font-size: 10px;
  color: var(--text-muted);
}

/* Stany */
.fund-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--text-muted);
}
.fund-muted  { color: var(--text-muted); }
.fund-error  { color: #ef5350; justify-content: flex-start; padding: 12px; }

/* Brak danych */
.fund-not-found {
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.fund-not-found strong { color: var(--accent); }
.fund-hint {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}

/* Zawartość */
.fund-content { padding: 4px 0 8px; }

/* Sekcja */
.fund-section { margin-bottom: 4px; }
.fund-section-hdr {
  padding: 6px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg-hover);
}

/* Wiersz klucz-wartość */
.fund-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 12px;
  border-bottom: 1px solid transparent;
  transition: background 0.1s;
}
.fund-row:hover { background: var(--bg-hover); }
.fund-row-top   { padding-left: 12px; }

.fund-key {
  color: var(--text-secondary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fund-val {
  color: var(--text-primary);
  font-weight: 500;
  flex-shrink: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.fund-positive { color: var(--up-color); }
.fund-negative { color: var(--down-color); }
</style>
