<script setup lang="ts">
defineProps<{ variant?: string; width?: string; height?: string; lines?: number }>()

// Distinct name so the template tag <l-skeleton> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LSkeletonWrapper' })
</script>

<template>
  <l-skeleton :variant="variant" :width="width" :height="height" :lines="lines" />
</template>
