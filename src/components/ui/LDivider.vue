<script setup lang="ts">
defineProps<{
  orientation?: 'horizontal' | 'vertical'
  resizable?: boolean
  handleVariant?: 'grip' | 'dots' | 'arrows' | 'circle' | 'bar' | 'pill'
  /** Keyboard step in px. */
  step?: number
}>()
const emit = defineEmits<{ resize: [delta: number] }>()

// Distinct name so the template tag <l-divider> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LDividerWrapper' })
</script>

<template>
  <!-- The host is blockified as a grid/flex item; h-full lets the vertical divider span the whole pane height. -->
  <l-divider
    class="block h-full"
    :orientation="orientation"
    :resizable="resizable || undefined"
    :handleVariant="handleVariant"
    :step="step"
    @resize="emit('resize', Number($event.detail))"
  />
</template>
