<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { state, close } = useToast()
</script>

<template>
  <l-toast
    :open="state.open || undefined"
    :variant="state.variant"
    :heading="state.heading"
    :duration="state.duration"
    @close="close"
  >{{ state.message }}</l-toast>
</template>
