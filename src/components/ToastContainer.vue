<template>
  <Teleport to="body">
    <div class="toast-wrap" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="toast in store.toasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.type}`"
          role="alert"
          @click="store.dismiss(toast.id)"
        >
          <span class="toast-icon">{{ ICONS[toast.type] ?? 'ℹ' }}</span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-x" title="Zamknij" @click.stop="store.dismiss(toast.id)">×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore.js'

const store = useUiFeedbackStore()

const ICONS = {
  error:   '✕',
  success: '✓',
  warning: '⚠',
  info:    'ℹ',
}
</script>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 52px;        /* poniżej toolbara */
  right: 56px;      /* lewa krawędź przy RightIconRail */
  z-index: 900;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 260px;
  max-width: 360px;
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid currentColor;
  background: var(--bg-elevated);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  pointer-events: all;
  transition: opacity 0.2s, box-shadow 0.2s;
  word-break: break-word;
}
.toast:hover { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); }

.toast-error   { color: #ef5350; }
.toast-success { color: #26a69a; }
.toast-warning { color: #f1c40f; }
.toast-info    { color: var(--accent); }

.toast-icon {
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 1px;
}
.toast-msg {
  flex: 1;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-primary);
}
.toast-x {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-muted);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background 0.1s, color 0.1s;
}
.toast-x:hover { background: var(--bg-hover); color: var(--text-primary); }

/* TransitionGroup animations */
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(30px); }
.toast-leave-to     { opacity: 0; transform: translateX(30px); }
.toast-move         { transition: transform 0.25s ease; }
</style>
