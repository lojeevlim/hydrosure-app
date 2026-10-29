<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Paginated } from '@hydrosure/shared'
import LSearchInput from '../ui/LSearchInput.vue'
import LSelect from '../ui/LSelect.vue'
import LTable, { type SortState } from '../ui/LTable.vue'
import LPagination from '../ui/LPagination.vue'
import ErrorState from '../ui/ErrorState.vue'
import EmptyState from '../ui/EmptyState.vue'
import { api, errorMessage } from '../../lib/api'
import { formatMoney } from '../../lib/format'
import type { LTableAction, LTableColumn } from '../../types/lojee-elements'
import { reorderSuggestion, stockStatus, type StockProduct } from './types'

const props = defineProps<{ initialStatus?: 'all' | 'low' | 'out' }>()
const emit = defineEmits<{ action: [action: 'receive' | 'adjust' | 'waste', product: StockProduct] }>()

const items = ref<StockProduct[]>([])
const loading = ref(true)
const loadError = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const searchInput = ref('')
const filters = reactive({ search: '', status: props.initialStatus ?? 'all', sortBy: 'name', sortDir: 'asc' as 'asc' | 'desc' })

const statusOptions = [
  { label: 'All products', value: 'all' },
  { label: 'Low stock (at or below reorder level)', value: 'low' },
  { label: 'Out of stock', value: 'out' },
]

const columns: LTableColumn[] = [
  { key: 'sku', header: 'SKU', sortable: true },
  { key: 'name', header: 'Product', sortable: true },
  { key: 'stockQty', header: 'On hand', sortable: true, align: 'right' },
  { key: 'reorderLevel', header: 'Reorder level', align: 'right' },
  { key: 'status', header: 'Status', type: 'status' },
  { key: 'suggested', header: 'Suggested reorder', align: 'right' },
  { key: 'costText', header: 'Unit cost', align: 'right' },
  { key: 'valueText', header: 'Value', align: 'right' },
]
const actions: LTableAction[] = [
  { label: 'Receive', value: 'receive', icon: 'plus' },
  { label: 'Adjust', value: 'adjust', icon: 'sliders-horizontal' },
  { label: 'Damage / waste', value: 'waste', icon: 'trash-2' },
]

const rows = computed(() =>
  items.value.map((p) => ({
    ...p,
    status: stockStatus(p),
    suggested: reorderSuggestion(p),
    costText: formatMoney(p.cost),
    valueText: formatMoney(Math.max(0, p.stockQty) * Number(p.cost)),
  })),
)

let seq = 0
async function load() {
  const mine = ++seq
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await api.get<Paginated<StockProduct>>('/products', {
      params: {
        page: page.value,
        pageSize: 20,
        search: filters.search || undefined,
        stock: filters.status === 'all' ? undefined : filters.status,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      },
    })
    if (mine !== seq) return
    items.value = data.items
    total.value = data.total
    totalPages.value = Math.max(1, data.totalPages)
  } catch (e) {
    if (mine !== seq) return
    loadError.value = errorMessage(e, 'Could not load stock levels')
  } finally {
    if (mine === seq) loading.value = false
  }
}

const applySearch = useDebounceFn((v: string) => { filters.search = v.trim() }, 300)
watch(searchInput, (v) => applySearch(v))
watch(() => [filters.search, filters.status, filters.sortBy, filters.sortDir], () => {
  if (page.value !== 1) page.value = 1
  else load()
})
watch(page, load)

function onSort(s: SortState) {
  filters.sortBy = s?.key ?? 'name'
  filters.sortDir = s?.direction ?? 'asc'
}
function onAction(action: string, row: StockProduct) {
  emit('action', action as 'receive' | 'adjust' | 'waste', row)
}

onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-3 sm:grid-cols-2">
      <LSearchInput v-model="searchInput" placeholder="Search name, SKU, barcode" />
      <LSelect v-model="filters.status" :options="statusOptions" />
    </div>
    <p class="text-xs text-fg-muted">
      Suggested reorder = max(0, max stock - on hand) when max stock is set, otherwise max(0, reorder level x 2 - on hand). Low stock means on hand is at or below the reorder level.
    </p>

    <ErrorState v-if="loadError" heading="Could not load stock levels" :message="loadError" @retry="load" />
    <EmptyState
      v-else-if="!loading && !items.length"
      icon="box"
      :heading="filters.search || filters.status !== 'all' ? 'No products match your filters' : 'No products yet'"
    />
    <div v-else class="space-y-3">
      <div class="overflow-x-auto">
        <LTable :columns="columns" :rows="rows" row-key="id" :actions="actions" :loading="loading" :skeleton-rows="8" @sort="onSort" @action="onAction" />
      </div>
      <div v-if="totalPages > 1" class="flex justify-center">
        <LPagination v-model:page="page" :total-pages="totalPages" />
      </div>
    </div>
  </div>
</template>
