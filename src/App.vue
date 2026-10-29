<script setup lang="ts">
import LToastHost from './components/ui/LToastHost.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'
</script>

<template>
  <!-- Applies lojee-ui's persisted theme to <html> at startup so pages without a switcher (/login) honour it; <l-theme-switcher> owns changes. -->
  <l-theme-provider></l-theme-provider>
  <RouterView />
  <ConfirmDialog />
  <LToastHost />
</template>
