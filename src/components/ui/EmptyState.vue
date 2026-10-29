<script setup lang="ts">
defineProps<{ heading: string; description?: string; icon?: string }>()
</script>

<template>
  <l-empty-state :icon="icon" :heading="heading">
    {{ description }}
    <slot />
  </l-empty-state>
</template>
