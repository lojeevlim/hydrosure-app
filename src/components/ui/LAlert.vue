<script setup lang="ts">
defineProps<{
  variant?: 'info' | 'success' | 'warning' | 'error'
  heading?: string
  icon?: string
  closable?: boolean
}>()
const emit = defineEmits<{ close: [] }>()

// Distinct name so the template tag <l-alert> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LAlertWrapper' })
</script>

<template>
  <l-alert :variant="variant" :heading="heading" :icon="icon" :closable="closable || undefined" @close="emit('close')">
    <slot />
  </l-alert>
</template>
