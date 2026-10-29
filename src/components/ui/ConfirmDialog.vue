<script setup lang="ts">
import { useConfirmState } from '../../composables/useConfirm'

const { state, settle } = useConfirmState()
// The library fires `confirm` and then `close`; the first settle wins (resolver is cleared afterwards).
</script>

<template>
  <l-alert-dialog
    :open="state.open || undefined"
    :heading="state.heading"
    :description="state.description"
    :variant="state.destructive ? 'destructive' : 'default'"
    :confirm-label="state.confirmLabel"
    :cancel-label="state.cancelLabel"
    @confirm="settle(true)"
    @close="settle(false)"
  />
</template>
