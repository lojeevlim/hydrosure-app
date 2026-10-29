<script setup lang="ts">
defineProps<{ label?: string; variant?: string; color?: string; size?: string; icon?: string; dot?: boolean }>()

// Distinct name so the template tag <l-badge> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LBadgeWrapper' })
</script>

<template>
  <l-badge :label="label" :variant="variant" :color="color" :size="size" :icon="icon" :dot="dot || undefined" />
</template>
