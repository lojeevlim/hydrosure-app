<script setup lang="ts">
defineProps<{ title?: string; variant?: string; padding?: string; hoverable?: boolean }>()

// Distinct name so the template tag <l-card> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LCardWrapper' })
</script>

<template>
  <l-card :title="title" :variant="variant" :padding="padding" :hoverable="hoverable || undefined">
    <slot />
  </l-card>
</template>
