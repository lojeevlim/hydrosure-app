<script setup lang="ts">
import LCard from '../ui/LCard.vue'
import LSkeleton from '../ui/LSkeleton.vue'
import EmptyState from '../ui/EmptyState.vue'

defineProps<{ title: string; loading?: boolean; empty?: boolean; emptyText?: string }>()
</script>

<template>
  <LCard class="block min-w-0">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-fg">{{ title }}</h3>
      <slot name="action" />
    </div>
    <LSkeleton v-if="loading" variant="text" :lines="5" />
    <EmptyState v-else-if="empty" icon="inbox" :heading="emptyText ?? 'Nothing to show for this period.'" />
    <slot v-else />
  </LCard>
</template>
