import { defineStore } from 'pinia'

let _toastId = 0

export const useUiFeedbackStore = defineStore('uiFeedback', {
  state: () => ({
    toasts: [],
    globalError: null,
  }),

  actions: {
    notify(type, message, duration = 3500) {
      const id = ++_toastId
      this.toasts.push({ id, type, message })
      setTimeout(() => this.dismiss(id), duration)
    },

    dismiss(id) {
      this.toasts = this.toasts.filter(t => t.id !== id)
    },

    setGlobalError(message) {
      this.globalError = message
    },

    clearGlobalError() {
      this.globalError = null
    },
  },
})
