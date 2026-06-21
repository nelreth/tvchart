<template>
  <div class="search-panel">
    <!-- Kryteria wyszukiwania -->
    <div class="search-criteria">
      <div class="criteria-row">
        <label class="criteria-label">Cena</label>
        <select v-model="operator" class="criteria-select">
          <option value="above">&gt; Above</option>
          <option value="below">&lt; Below</option>
          <option value="between">= Between</option>
        </select>
      </div>

      <!-- Inputs dla above/below -->
      <div v-if="operator !== 'between'" class="criteria-inputs">
        <input
          v-model.number="priceValue"
          type="number"
          placeholder="Cena"
          class="input-price"
        />
      </div>

      <!-- Inputs dla between -->
      <div v-else class="criteria-inputs between">
        <input
          v-model.number="priceFrom"
          type="number"
          placeholder="Od"
          class="input-price"
        />
        <input
          v-model.number="priceTo"
          type="number"
          placeholder="Do"
          class="input-price"
        />
      </div>
    </div>

    <!-- Guzik Search -->
    <button
      class="search-btn"
      @click="handleSearch"
      :disabled="isSearching"
    >
      {{ isSearching ? 'Searching...' : 'Search' }}
    </button>

    <!-- Błąd -->
    <div v-if="error" class="search-error">{{ error }}</div>

    <!-- Ładowanie -->
    <div v-if="isSearching && results.length === 0" class="search-loading">
      Wyszukiwanie…
    </div>

    <!-- Wyniki -->
    <div v-else-if="results.length > 0" class="search-results">
      <div class="results-header">{{ results.length }} wyników</div>
      <div class="results-table">
        <!-- Nagłówek -->
        <div class="result-row result-header">
          <span class="col-ticker">Ticker</span>
          <span class="col-price">Price</span>
          <span class="col-volume">Volume</span>
        </div>
        <!-- Wiersze -->
        <div
          v-for="row in results"
          :key="row.ticker"
          class="result-row result-data"
          :class="{ 'result-selected': row.ticker === selectedTicker }"
          @click="selectTicker(row.ticker)"
        >
          <span class="col-ticker">{{ row.ticker }}</span>
          <span class="col-price">{{ formatPrice(row.price) }}</span>
          <span class="col-volume">{{ formatVolume(row.volume) }}</span>
        </div>
      </div>
    </div>

    <!-- Brak wyników -->
    <div v-else-if="hasSearched && results.length === 0" class="search-empty">
      Brak wyników dla podanych kryteriów.
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMarketStore } from '@/stores/marketStore.js'

const marketStore = useMarketStore()

const operator = ref('above')
const priceValue = ref(null)
const priceFrom = ref(null)
const priceTo = ref(null)
const results = ref([])
const isSearching = ref(false)
const error = ref(null)
const hasSearched = ref(false)
const selectedTicker = ref(null)

async function handleSearch() {
  error.value = null
  hasSearched.value = true

  // Walidacja
  if (operator.value !== 'between' && priceValue.value === null) {
    error.value = 'Podaj cenę'
    return
  }
  if (operator.value === 'between' && (priceFrom.value === null || priceTo.value === null)) {
    error.value = 'Podaj zakres cen'
    return
  }

  isSearching.value = true
  try {
    const payload = {
      operator: operator.value,
      price: operator.value !== 'between' ? priceValue.value : null,
      price_from: operator.value === 'between' ? priceFrom.value : null,
      price_to: operator.value === 'between' ? priceTo.value : null,
    }

    const response = await fetch('http://192.168.1.145:6070/search/by-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    results.value = data
  } catch (e) {
    error.value = `Błąd: ${e.message}`
    results.value = []
  } finally {
    isSearching.value = false
  }
}

function selectTicker(ticker) {
  selectedTicker.value = ticker
  marketStore.setTicker(ticker)
}

function formatPrice(price) {
  return typeof price === 'number' ? price.toFixed(2) : '—'
}

function formatVolume(volume) {
  if (!volume) return '—'
  if (volume >= 1000000) return (volume / 1000000).toFixed(1) + 'M'
  if (volume >= 1000) return (volume / 1000).toFixed(1) + 'K'
  return volume.toString()
}
</script>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-criteria {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 8px;
}

.criteria-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.criteria-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 50px;
}

.criteria-select,
.input-price {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: 12px;
  transition: border 0.15s;
}

.criteria-select:focus,
.input-price:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--focus-ring-soft);
}

.criteria-inputs {
  display: flex;
  gap: 8px;
}

.criteria-inputs.between {
  flex-direction: column;
}

.input-price {
  width: 100%;
}

.search-btn {
  width: 100%;
  height: 32px;
  background: var(--accent);
  color: var(--bg-primary);
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s;
}

.search-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-error {
  padding: 8px 12px;
  background: var(--status-error-bg);
  border: 1px solid var(--status-error);
  border-radius: 4px;
  color: var(--status-error);
  font-size: 11px;
}

.search-loading,
.search-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.results-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.results-table {
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.result-row {
  display: grid;
  grid-template-columns: 60px 1fr 1fr;
  gap: 8px;
  padding: 8px 10px;
  font-size: 11px;
  align-items: center;
}

.result-header {
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  color: var(--text-secondary);
}

.result-data {
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}

.result-data:last-child {
  border-bottom: none;
}

.result-data:hover {
  background: var(--bg-hover);
}

.result-data.result-selected {
  background: var(--accent);
  color: var(--bg-primary);
}

.result-data.result-selected .col-ticker {
  color: var(--bg-primary);
}

.result-data.result-selected .col-price,
.result-data.result-selected .col-volume {
  color: var(--bg-primary);
}

.col-ticker {
  font-weight: 600;
  color: var(--text-primary);
}

.col-price,
.col-volume {
  text-align: right;
  color: var(--text-secondary);
}
</style>
