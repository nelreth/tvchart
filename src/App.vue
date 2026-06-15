<template>
    <App-shell />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/appStore.js'
import AppShell from '@/components/AppShell.vue'

const appStore = useAppStore()

onMounted(() => {
    // Synchronizacja motywu z <html data-theme>
    document.documentElement.setAttribute('data-theme', appStore.theme)
})
</script>