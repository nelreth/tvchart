<template>
  <div class="app-shell">
    <TopToolbar />
    <div class="app-body">
      <div class="chart-area">
        <ChartTabs />
      </div>
      <Transition name="slide-panel">
        <ContextPanel v-if="appStore.isContextPanelOpen" />
      </Transition>
      <RightIconRail />
    </div>
    <ToastContainer />
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useAppStore } from '@/stores/appStore.js'
import TopToolbar    from '@/components/TopToolbar.vue'
import ChartTabs     from '@/components/ChartTabs.vue'
import ContextPanel  from '@/components/ContextPanel.vue'
import RightIconRail from '@/components/RightIconRail.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const appStore = useAppStore()

// Propaguj zmianę motywu do <html>
watch(() => appStore.theme, (theme) => {
  document.documentElement.setAttribute('data-theme', theme)
})
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.app-body {
  display: flex;
  flex: 1;
  min-height: 0; /* konieczne by flex-child nie przerastał rodzica */
  overflow: hidden;
}

.chart-area {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  position: relative;
}
</style>
