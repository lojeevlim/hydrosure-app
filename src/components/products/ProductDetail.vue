<script setup lang="ts">
import LModal from '../ui/LModal.vue'
import LButton from '../ui/LButton.vue'
import { formatDate } from '../../lib/format'
import type { ProductRow } from './types'

defineProps<{ product: ProductRow | null }>()
const open = defineModel<boolean>('open', { default: false })

const money = (v: string | number) => Number(v).toLocaleString(undefined, { style: 'currency', currency: 'PHP' })
</script>

<template>
  <LModal v-model:open="open" :heading="product?.name ?? 'Product'">
    <div v-if="product" class="w-[min(32rem,85vw)] space-y-4 p-1 text-sm">
      <img
        v-if="product.imageUrl"
        :src="product.imageUrl"
        :alt="product.name"
        referrerpolicy="no-referrer"
        class="mx-auto max-h-40 rounded border border-border object-contain"
      />
      <dl class="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2">
        <dt class="text-fg-muted">SKU</dt><dd>{{ product.sku }}</dd>
        <dt class="text-fg-muted">Barcode</dt><dd>{{ product.barcode || '-' }}</dd>
        <dt class="text-fg-muted">Category</dt><dd>{{ product.category?.name || '-' }}</dd>
        <dt class="text-fg-muted">Brand</dt><dd>{{ product.brand?.name || '-' }}</dd>
        <dt class="text-fg-muted">Unit</dt><dd>{{ product.unit?.name || '-' }}</dd>
        <dt class="text-fg-muted">Supplier</dt><dd>{{ product.supplier?.name || '-' }}</dd>
        <dt class="text-fg-muted">Tax</dt><dd>{{ product.taxCategory ? `${product.taxCategory.name} (${Number(product.taxCategory.rate)}%)` : 'None' }}</dd>
        <dt class="text-fg-muted">Cost</dt><dd>{{ money(product.cost) }}</dd>
        <dt class="text-fg-muted">Price</dt><dd>{{ money(product.price) }}</dd>
        <dt class="text-fg-muted">Wholesale price</dt><dd>{{ product.wholesalePrice == null ? '-' : money(product.wholesalePrice) }}</dd>
        <dt class="text-fg-muted">In stock</dt><dd>{{ product.stockQty }}</dd>
        <dt class="text-fg-muted">Reorder level</dt><dd>{{ product.reorderLevel }}</dd>
        <dt class="text-fg-muted">Max stock</dt><dd>{{ product.maxStock ?? '-' }}</dd>
        <dt class="text-fg-muted">Expires</dt><dd>{{ product.expirationDate ? formatDate(product.expirationDate.slice(0, 10) + 'T12:00:00') : '-' }}</dd>
        <dt class="text-fg-muted">Tags</dt><dd>{{ product.tags.map((t) => t.name).join(', ') || '-' }}</dd>
        <dt class="text-fg-muted">Status</dt><dd>{{ product.archivedAt ? 'Archived' : 'Active' }}</dd>
        <dt class="text-fg-muted">Description</dt><dd class="whitespace-pre-wrap">{{ product.description || '-' }}</dd>
      </dl>
      <div class="flex justify-end"><LButton variant="outline" @click="open = false">Close</LButton></div>
    </div>
  </LModal>
</template>
