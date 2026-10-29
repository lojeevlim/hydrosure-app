<script setup lang="ts">
// An `undefined` number property would be coerced to NaN by the element, so `max` is only passed when set.
defineProps<{ value: number; max?: number; size?: string; color?: string; showLabel?: boolean }>()

// Distinct name so the template tag <l-progress-bar> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LProgressBarWrapper' })
</script>

<template>
  <l-progress-bar :value="value" v-bind="max === undefined ? {} : { max }" :size="size" :color="color" :show-label="showLabel || undefined" />
</template>
