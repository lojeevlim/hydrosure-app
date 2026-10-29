<script setup lang="ts">
import { formatDateTime } from '../../lib/format'
import LButton from '../ui/LButton.vue'
import LSkeleton from '../ui/LSkeleton.vue'
import LModal from '../ui/LModal.vue'
import EmptyState from '../ui/EmptyState.vue'

export interface HeldCartDto {
  id: string
  label: string | null
  createdAt: string
  items: { productId: string; qty: number }[]
}

defineProps<{ carts: HeldCartDto[]; loading?: boolean; busyId?: string | null }>()
const emit = defineEmits<{ resume: [cart: HeldCartDto]; discard: [cart: HeldCartDto] }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <LModal v-model:open="open" heading="Held carts">
    <div v-if="loading" class="flex flex-col gap-2" aria-busy="true" aria-label="Loading held carts">
      <LSkeleton v-for="n in 3" :key="n" variant="rectangular" height="2.5rem" />
    </div>
    <EmptyState v-else-if="!carts.length" heading="No held carts" description="Hold a cart to serve another customer first." icon="clock" />
    <ul v-else class="divide-y divide-border">
      <li v-for="c in carts" :key="c.id" class="flex flex-wrap items-center gap-2 py-2" data-testid="held-item">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ c.label || 'Held cart' }}</p>
          <p class="text-xs text-fg-muted">{{ c.items.length }} item(s) - {{ formatDateTime(c.createdAt) }}</p>
        </div>
        <LButton size="sm" :disabled="busyId === c.id" data-testid="held-resume" @click="emit('resume', c)">Resume</LButton>
        <LButton size="sm" variant="destructive-outline" :disabled="busyId === c.id" @click="emit('discard', c)">Discard</LButton>
      </li>
    </ul>
  </LModal>
</template>
