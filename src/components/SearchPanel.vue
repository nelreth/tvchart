<template>
  <div class="search-panel">
    <!-- Kryteria wyszukiwania -->
    <div class="search-criteria">
      <!-- Sector -->
      <div class="criteria-row">
        <label class="criteria-label">Sector</label>
        <select v-model="selectedSector" class="criteria-select">
          <option value="">— wszystkie —</option>
          <option v-for="s in sectors" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <!-- Industry -->
      <div class="criteria-row">
        <label class="criteria-label">Industry</label>
        <select v-model="selectedIndustry" class="criteria-select" :disabled="!selectedSector">
          <option value="">— wszystkie —</option>
          <option v-for="i in industries" :key="i" :value="i">{{ i }}</option>
        </select>
      </div>

      <div class="criteria-row">
        <label class="criteria-label">Cena</label>
        <select v-model="operator" class="criteria-select">
          <option value="none">— brak —</option>
          <option value="above">&gt; Above</option>
          <option value="below">&lt; Below</option>
          <option value="between">= Between</option>
        </select>
      </div>

      <!-- Inputs dla above/below -->
      <div v-if="operator !== 'between' && operator !== 'none'" class="criteria-inputs">
        <input
          v-model.number="priceValue"
          type="number"
          placeholder="Cena"
          class="input-price"
        />
      </div>

      <!-- Inputs dla between -->
      <div v-else-if="operator === 'between'" class="criteria-inputs between">
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

      <!-- Volume (10d avg) -->
      <div class="criteria-row">
        <label class="criteria-label">Volume</label>
        <select v-model="volOperator" class="criteria-select">
          <option value="">— brak —</option>
          <option value="above">&gt; Above</option>
          <option value="between">= Between</option>
        </select>
      </div>

      <div v-if="volOperator === 'above'" class="criteria-inputs">
        <input
          v-model.number="volValue"
          type="number"
          placeholder="10d avg vol"
          class="input-price"
        />
      </div>

      <div v-else-if="volOperator === 'between'" class="criteria-inputs between">
        <input
          v-model.number="volFrom"
          type="number"
          placeholder="Od"
          class="input-price"
        />
        <input
          v-model.number="volTo"
          type="number"
          placeholder="Do"
          class="input-price"
        />
      </div>

      <div v-if="volOperator" class="criteria-hint">
        Avg volume z ostatnich 10 dni
      </div>
    </div>

    <!-- Opcje kolumn -->
    <label class="col-toggle">
      <input type="checkbox" v-model="showAvgVolume" />
      Avg 10d
    </label>

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
        <div class="result-row result-header" :class="{ 'has-avg': showAvgVolume }">
          <span class="col-ticker">Ticker</span>
          <span class="col-price">Price</span>
          <span class="col-volume">Volume</span>
          <span v-if="showAvgVolume" class="col-volume">Avg 10d</span>
        </div>
        <!-- Wiersze -->
        <div
          v-for="row in results"
          :key="row.ticker"
          class="result-row result-data"
          :class="{ 'result-selected': row.ticker === selectedTicker, 'has-avg': showAvgVolume }"
          @click="selectTicker(row.ticker)"
        >
          <span class="col-ticker">{{ row.ticker }}</span>
          <span class="col-price">{{ formatPrice(row.price) }}</span>
          <span class="col-volume">{{ formatVolume(row.volume) }}</span>
          <span v-if="showAvgVolume" class="col-volume">{{ formatVolume(row.avg_volume) }}</span>
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
import { ref, computed, watch, onMounted } from 'vue'
import { usePanelStore } from '@/stores/panelStore.js'

const panelStore = usePanelStore()

const sectors = ref([])
const sectorIndustries = ref({})
const selectedSector = ref('')
const selectedIndustry = ref('')

const industries = computed(() => {
  if (!selectedSector.value) return []
  return sectorIndustries.value[selectedSector.value] ?? []
})

watch(selectedSector, () => {
  selectedIndustry.value = ''
})

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:6070/sectors-industries')
    if (res.ok) {
      const data = await res.json()
      sectors.value = data.sectors
      sectorIndustries.value = data.sector_industries
    }
  } catch {}
})

const operator = ref('none')
const priceValue = ref(null)
const priceFrom = ref(null)
const priceTo = ref(null)

const volOperator = ref('')
const volValue = ref(null)
const volFrom = ref(null)
const volTo = ref(null)

const showAvgVolume = ref(false)

const results = ref([])
const isSearching = ref(false)
const error = ref(null)
const hasSearched = ref(false)
const selectedTicker = ref(null)

async function handleSearch() {
  error.value = null
  hasSearched.value = true

  // Walidacja ceny
  if (operator.value !== 'between' && operator.value !== 'none' && priceValue.value === null) {
    error.value = 'Podaj cenę'
    return
  }
  if (operator.value === 'between' && (priceFrom.value === null || priceTo.value === null)) {
    error.value = 'Podaj zakres cen'
    return
  }

  // Walidacja wolumenu
  if (volOperator.value === 'above' && volValue.value === null) {
    error.value = 'Podaj wartość wolumenu'
    return
  }
  if (volOperator.value === 'between' && (volFrom.value === null || volTo.value === null)) {
    error.value = 'Podaj zakres wolumenu'
    return
  }

  isSearching.value = true
  try {
    const payload = {
      operator: operator.value,
      price: operator.value !== 'between' ? priceValue.value : null,
      price_from: operator.value === 'between' ? priceFrom.value : null,
      price_to: operator.value === 'between' ? priceTo.value : null,
      vol_operator: volOperator.value || null,
      vol_value: volOperator.value === 'above' ? volValue.value : null,
      vol_from: volOperator.value === 'between' ? volFrom.value : null,
      vol_to: volOperator.value === 'between' ? volTo.value : null,
      sector: selectedSector.value || null,
      industry: selectedIndustry.value || null,
    }

    const response = await fetch(`http://localhost:6070/search/by-price`, {
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
  panelStore.setActiveTicker(ticker)
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

.col-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.col-toggle input[type="checkbox"] {
  accent-color: var(--accent);
  cursor: pointer;
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

.criteria-hint {
  font-size: 10px;
  color: var(--text-muted);
  padding-left: 58px;
  margin-top: -4px;
}

.result-row {
  display: grid;
  grid-template-columns: 60px 1fr 1fr;
}

.result-row.has-avg {
  grid-template-columns: 60px 1fr 1fr 1fr;
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
