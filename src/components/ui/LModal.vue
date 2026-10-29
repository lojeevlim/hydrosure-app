<script setup lang="ts">
defineProps<{ heading?: string }>()
// Controlled: the library emits `close` (Esc / overlay / X) and the page decides; here we just flip v-model.
const open = defineModel<boolean>('open', { default: false })

// Distinct name so the template tag <l-modal> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LModalWrapper' })
</script>

<template>
  <l-modal :open="open || undefined" :heading="heading" @close="open = false">
    <slot />
  </l-modal>
</template>
