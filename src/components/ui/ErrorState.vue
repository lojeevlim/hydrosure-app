<script setup lang="ts">
import LButton from './LButton.vue'

withDefaults(defineProps<{ heading?: string; message?: string; retryLabel?: string }>(), {
  heading: 'Something went wrong',
  retryLabel: 'Retry',
})
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <l-error-state :heading="heading">
    <!-- <l-error-state> does not render its default-slot text (its slot map targets a `description` prop that the
         component does not have), so the message is projected through the working `action` slot with the button. -->
    <div slot="action" class="flex flex-col items-center gap-3">
      <p v-if="message" class="max-w-md text-sm text-fg-muted">{{ message }}</p>
      <LButton variant="outline" size="sm" :label="retryLabel" @click="emit('retry')" />
    </div>
  </l-error-state>
</template>
