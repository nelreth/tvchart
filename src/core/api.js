const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:6070'

async function request(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  return res.json()
}

export async function fetchTickers(search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  return request(`/tickers${q}`)
}

export async function fetchPrices(ticker, { limit = 264, before = null } = {}) {
  let path = `/prices/${encodeURIComponent(ticker)}?limit=${limit}`
  if (before) path += `&before=${before}`
  return request(path)
}

export async function fetchWatchlistColors() {
  return request('/watchlist-colors')
}

export async function fetchWatchlists() {
  return request('/watchlists')
}

export async function fetchWatchlistItems(watchlistId) {
  return request(`/watchlists/${watchlistId}/items`)
}

export async function addWatchlistItem(watchlistId, ticker, note = null) {
  const res = await fetch(`${API_BASE}/watchlists/${watchlistId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, note }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function removeWatchlistItem(watchlistId, ticker) {
  const res = await fetch(`${API_BASE}/watchlists/${watchlistId}/items/${encodeURIComponent(ticker)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function createWatchlist(payload) {
  const res = await fetch(`${API_BASE}/watchlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchScanners() {
  return request('/scanners')
}

export async function fetchScannerResults(scannerId, limit = 200) {
  return request(`/scanners/${scannerId}/results?limit=${limit}`)
}

export async function fetchFundamentals(ticker) {
  return request(`/fundamentals/${encodeURIComponent(ticker)}`)
}
