<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')" @keydown.esc="$emit('close')">
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="Wybierz ticker">
        <!-- Header -->
        <div class="modal-header">
          <span class="modal-title">Wybierz ticker</span>
          <button class="modal-close" @click="$emit('close')">✕</button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <input
            ref="searchRef"
            v-model="search"
            class="search-input"
            type="text"
            placeholder="Szukaj po tickerze lub nazwie…"
            spellcheck="false"
            autocomplete="off"
            @keydown.enter="confirmFirst"
            @keydown.down.prevent="moveSelection(1)"
            @keydown.up.prevent="moveSelection(-1)"
          />
          <div class="ticker-count">
            <span v-if="isLoading">Ładowanie…</span>
            <span v-else>{{ filtered.length }} tickerów</span>
          </div>
          <div class="ticker-list-wrap">
            <div
              v-if="isLoading"
              class="list-loading"
            >Pobieranie listy…</div>
            <ul v-else class="ticker-list" ref="listRef" :style="{ '--ticker-item-color': appStore.themeColors.tickerItemColor }">
              <li
                v-for="(item, idx) in filtered"
                :key="item.ticker"
                class="ticker-item"
                :class="{ selected: item.ticker === selectedTicker, focused: idx === focusedIdx }"
                @click="selectedTicker = item.ticker"
                @dblclick="confirm"
              >
                <span class="t-symbol">{{ item.ticker }}</span>
                <span class="t-name">{{ item.name }}</span>
              </li>
              <li v-if="filtered.length === 0" class="ticker-empty">
                Brak wyników dla „{{ search }}"
              </li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-cancel" @click="$emit('close')">Anuluj</button>
          <button
            class="btn-confirm"
            :disabled="!selectedTicker"
            @click="confirm"
          >Wybierz</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchTickers } from '@/core/api.js'
import { useAppStore } from '@/stores/appStore.js'

const appStore = useAppStore()

const props = defineProps({
  currentTicker: { type: String, default: '' },
})

const emit = defineEmits(['close', 'select'])

const search        = ref('')
const allTickers    = ref([])
const isLoading     = ref(true)
const selectedTicker = ref(props.currentTicker)
const focusedIdx    = ref(-1)
const searchRef     = ref(null)
const listRef       = ref(null)

const filtered = computed(() => {
  const q = search.value.trim().toUpperCase()
  if (!q) return allTickers.value

  const scored = []
  for (const t of allTickers.value) {
    const sym  = t.ticker.toUpperCase()
    const name = t.name.toUpperCase()
    let rank = -1
    if (sym === q)               rank = 0  // dokładne dopasowanie tickera
    else if (sym.startsWith(q))  rank = 1  // ticker zaczyna się od frazy
    else if (sym.includes(q))    rank = 2  // ticker zawiera frazę
    else if (name.startsWith(q)) rank = 3  // nazwa firmy zaczyna się od frazy
    else if (name.includes(q))   rank = 4  // nazwa firmy zawiera frazę
    if (rank >= 0) scored.push({ ...t, _rank: rank })
  }

  scored.sort((a, b) =>
    a._rank !== b._rank
      ? a._rank - b._rank
      : a.ticker.localeCompare(b.ticker)
  )

  return scored
})

onMounted(async () => {
  searchRef.value?.focus()
  try {
    allTickers.value = await fetchTickers()
  } catch (e) {
    console.error('Błąd pobierania tickerów:', e)
  } finally {
    isLoading.value = false
  }
})

// Reset focusedIdx przy zmianie search
watch(search, () => { focusedIdx.value = -1 })

function moveSelection(dir) {
  const max = filtered.value.length - 1
  if (max < 0) return
  focusedIdx.value = Math.max(0, Math.min(max, focusedIdx.value + dir))
  // Scrolluj do aktywnego elementu
  const li = listRef.value?.querySelectorAll('.ticker-item')[focusedIdx.value]
  li?.scrollIntoView({ block: 'nearest' })
}

function confirmFirst() {
  const idx    = focusedIdx.value >= 0 ? focusedIdx.value : 0
  const target = filtered.value[idx]
  if (target) {
    selectedTicker.value = target.ticker
    confirm()
  }
}

function confirm() {
  if (selectedTicker.value) emit('select', selectedTicker.value)
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  width: 440px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 20px 60px var(--shadow-strong);
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.modal-close {
  color: var(--text-muted);
  font-size: 14px;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}
.modal-close:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Body */
.modal-body {
  display: flex;
  flex-direction: column;
  padding: 10px 14px 0;
  flex: 1;
  min-height: 0;
}

.search-input {
  width: 100%;
  padding: 7px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--border-focus); }
.search-input::placeholder { color: var(--text-muted); }

.ticker-count {
  font-size: 11px;
  color: var(--text-muted);
  padding: 5px 0 3px;
}

.ticker-list-wrap {
  flex: 1;
  overflow-y: auto;
  margin: 0 -14px;
  padding: 0 14px;
}

.ticker-list {
  list-style: none;
}

.ticker-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.ticker-item:hover,
.ticker-item.focused   { background: var(--bg-hover); }
.ticker-item.selected  { background: var(--bg-hover); color: var(--accent); }

.t-symbol {
  font-size: 13px;
  font-weight: 600;
  min-width: 68px;
  color: var(--ticker-item-color, var(--text-primary));
}
.t-name {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-loading,
.ticker-empty {
  padding: 20px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.btn-cancel,
.btn-confirm {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s;
}

.btn-cancel {
  background: var(--bg-btn);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.btn-cancel:hover { background: var(--bg-btn-hover); color: var(--text-primary); }

.btn-confirm {
  background: var(--accent);
  border: 1px solid var(--accent);
  color: var(--text-on-accent);
}
.btn-confirm:hover:not(:disabled) { background: var(--accent-hover); }
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
