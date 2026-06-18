<template>
  <nav class="right-icon-rail">
    <button
      v-for="item in panels"
      :key="item.key"
      class="rail-btn"
      :class="{ active: appStore.activePanel === item.key }"
      :title="item.label"
      @click="appStore.setActivePanel(item.key)"
    >
      <span class="rail-icon" v-html="item.icon" />
    </button>
  </nav>
</template>

<script setup>
import { useAppStore } from '@/stores/appStore.js'

const appStore = useAppStore()

const panels = [
  {
    key:   'watchlist',
    label: 'Watchlisty',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>`,
  },
  {
    key:   'search',
    label: 'Search',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>`,
  },
  {
    key:   'scanners',
    label: 'Skanery',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="5"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
              <line x1="12" y1="12" x2="19" y2="5"/>
            </svg>`,
  },
  {
    key:   'fundamentals',
    label: 'Fundamentals',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6"  y1="20" x2="6"  y2="14"/>
            </svg>`,
  },
]
</script>

<style scoped>
.right-icon-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 46px;
  flex-shrink: 0;
  background-color: var(--bg-secondary);
  border-left: 1px solid var(--border);
  padding: 8px 0;
  gap: 4px;
}

.rail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  transition: background 0.15s, color 0.15s;
}

.rail-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.rail-btn.active {
  background: var(--bg-hover);
  color: var(--accent);
  box-shadow: inset 2px 0 0 var(--accent);
}

.rail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
</style>
