<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Paginated } from '@hydrosure/shared'
import LDatePicker from '../ui/LDatePicker.vue'
import LSelect from '../ui/LSelect.vue'
import LTable from '../ui/LTable.vue'
import LPagination from '../ui/LPagination.vue'
import ErrorState from '../ui/ErrorState.vue'
import EmptyState from '../ui/EmptyState.vue'
import ProductPicker from './ProductPicker.vue'
import { api, errorMessage } from '../../lib/api'
import { formatDateTime, localDayIso } from '../../lib/format'
import type { LTableColumn } from '../../types/lojee-elements'
import { movementTypeLabels, type MovementRow } from './types'

const items = ref<MovementRow[]>([])
const loading = ref(true)
const loadError = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const filters = reactive({ productId: '', type: '', from: '', to: '' })

const typeOptions = [
  { label: 'All types', value: '' },
  ...Object.entries(movementTypeLabels).map(([value, label]) => ({ label, value })),
]
const columns: LTableColumn[] = [
  { key: 'when', header: 'Date' },
  { key: 'productText', header: 'Product' },
  { key: 'typeStatus', header: 'Type', type: 'status' },
  { key: 'change', header: 'Change', align: 'right' },
  { key: 'qtyBefore', header: 'Before', align: 'right' },
  { key: 'qtyAfter', header: 'After', align: 'right' },
  { key: 'reasonText', header: 'Reason' },
  { key: 'by', header: 'By' },
]
const rows = computed(() =>
  items.value.map((m) => ({
    ...m,
    when: formatDateTime(m.createdAt),
    productText: `${m.product.sku} - ${m.product.name}`,
    typeStatus: { label: movementTypeLabels[m.type], color: m.qtyChange > 0 ? 'emerald' : 'rose' },
    change: m.qtyChange > 0 ? `+${m.qtyChange}` : String(m.qtyChange),
    reasonText: m.reason ?? '',
    by: m.user?.name ?? '',
  })),
)

const rangeError = computed(() => (filters.from && filters.to && filters.from > filters.to ? 'From must not be after To' : ''))

let seq = 0
async function load() {
  const mine = ++seq
  loading.value = true
  loadError.value = ''
  if (rangeError.value) { items.value = []; total.value = 0; totalPages.value = 1; loading.value = false; return }
  try {
    const { data } = await api.get<Paginated<MovementRow>>('/inventory/movements', {
      params: { page: page.value, pageSize: 20, productId: filters.productId || undefined, type: filters.type || undefined,
        from: localDayIso(filters.from, 'start'), to: localDayIso(filters.to, 'end') },
    })
    if (mine !== seq) return
    items.value = data.items
    total.value = data.total
    totalPages.value = Math.max(1, data.totalPages)
  } catch (e) {
    if (mine !== seq) return
    loadError.value = errorMessage(e, 'Could not load movement history')
  } finally {
    if (mine === seq) loading.value = false
  }
}
watch(() => [filters.productId, filters.type, filters.from, filters.to], () => {
  if (page.value !== 1) page.value = 1
  else load()
})
watch(page, load)
onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ProductPicker v-model="filters.productId" allow-all />
      <LSelect v-model="filters.type" :options="typeOptions" />
      <LDatePicker v-model="filters.from" label="From" />
      <LDatePicker v-model="filters.to" label="To" :error="rangeError" />
    </div>

    <ErrorState v-if="loadError" heading="Could not load movement history" :message="loadError" @retry="load" />
    <EmptyState
      v-else-if="!loading && !items.length"
      icon="clock"
      :heading="filters.productId || filters.type || filters.from || filters.to ? 'No movements match your filters' : 'No stock movements yet'"
    />
    <div v-else class="space-y-3">
      <div class="overflow-x-auto">
        <LTable :columns="columns" :rows="rows" row-key="id" :loading="loading" :skeleton-rows="8" />
      </div>
      <p class="text-xs text-fg-muted">{{ total }} movement{{ total === 1 ? '' : 's' }}</p>
      <div v-if="totalPages > 1" class="flex justify-center">
        <LPagination v-model:page="page" :total-pages="totalPages" />
      </div>
    </div>
  </div>
</template>
