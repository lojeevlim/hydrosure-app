<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Paginated } from '@hydrosure/shared'
import LButton from '../components/ui/LButton.vue'
import LSearchInput from '../components/ui/LSearchInput.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import LSelect from '../components/ui/LSelect.vue'
import LTable, { type SortState } from '../components/ui/LTable.vue'
import LPagination from '../components/ui/LPagination.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import ProductForm from '../components/products/ProductForm.vue'
import ProductDetail from '../components/products/ProductDetail.vue'
import type { CategoryRow, Named, ProductRow, SupplierRow, TaxCategoryRow, UnitRow } from '../components/products/types'
import type { LTableAction, LTableColumn } from '../types/lojee-elements'
import { api, errorMessage } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const toast = useToast()
const confirm = useConfirm()

const PAGE_SIZE = 20
const SORTABLE = ['name', 'sku', 'priceValue', 'stockQty']

const items = ref<ProductRow[]>([])
const total = ref(0)
const totalPages = ref(1)
const page = ref(1)
const loading = ref(true)
const loadError = ref('')
const exporting = ref(false)

const searchInput = ref('')
const filters = reactive({ search: '', categoryId: '', brandId: '', supplierId: '', status: 'active', stock: '' })
const sort = ref<{ sortBy: string; sortDir: 'asc' | 'desc' }>({ sortBy: 'name', sortDir: 'asc' })

const categories = ref<CategoryRow[]>([])
const brands = ref<Named[]>([])
const units = ref<UnitRow[]>([])
const suppliers = ref<SupplierRow[]>([])
const tags = ref<Named[]>([])
const taxCategories = ref<TaxCategoryRow[]>([])

const formOpen = ref(false)
const editing = ref<ProductRow | null>(null)
const detailOpen = ref(false)
const viewing = ref<ProductRow | null>(null)

const all = { label: 'All', value: '' }
const categoryOptions = computed(() => [{ label: 'All categories', value: '' }, ...categories.value.map((c) => ({ label: c.name, value: c.id }))])
const brandOptions = computed(() => [{ label: 'All brands', value: '' }, ...brands.value.map((b) => ({ label: b.name, value: b.id }))])
const supplierOptions = computed(() => [{ label: 'All suppliers', value: '' }, ...suppliers.value.map((s) => ({ label: s.name, value: s.id }))])
const statusOptions = [{ label: 'Active', value: 'active' }, { label: 'Archived', value: 'archived' }]
const stockOptions = [{ ...all, label: 'Any stock' }, { label: 'Low stock', value: 'low' }, { label: 'Out of stock', value: 'out' }]

const columns: LTableColumn[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'sku', header: 'SKU', sortable: true },
  { key: 'categoryName', header: 'Category' },
  { key: 'supplierName', header: 'Supplier' },
  { key: 'priceValue', header: 'Price', type: 'currency', align: 'right', sortable: true },
  { key: 'stockQty', header: 'Stock', align: 'right', sortable: true },
  { key: 'stockStatus', header: 'Level', type: 'status' },
]

function stockStatus(p: ProductRow) {
  if (p.archivedAt) return { label: 'Archived', color: 'slate' }
  if (p.stockQty <= 0) return { label: 'Out of stock', color: 'rose' }
  if (p.stockQty <= p.reorderLevel) return { label: 'Low stock', color: 'amber' }
  return { label: 'In stock', color: 'emerald' }
}

// Flat view-model: the table reads plain keys, so nested relations are projected here.
const rows = computed(() =>
  items.value.map((p) => ({
    ...p,
    categoryName: p.category?.name ?? '-',
    supplierName: p.supplier?.name ?? '-',
    priceValue: { value: Number(p.price), currency: 'PHP' },
    stockStatus: stockStatus(p),
  })),
)

const actions = computed<LTableAction[]>(() =>
  filters.status === 'archived'
    ? [{ label: 'View', value: 'view', icon: 'eye' }, { label: 'Restore', value: 'restore', icon: 'refresh-cw' }]
    : [
        { label: 'View', value: 'view', icon: 'eye' },
        { label: 'Edit', value: 'edit', icon: 'pencil' },
        { label: 'Archive', value: 'archive', icon: 'box', color: 'danger' },
      ],
)

function queryParams(p: number, pageSize: number) {
  const q: Record<string, string | number> = {
    page: p, pageSize, sortBy: sort.value.sortBy, sortDir: sort.value.sortDir,
    archived: filters.status === 'archived' ? 'true' : 'false',
  }
  if (filters.search) q.search = filters.search
  if (filters.categoryId) q.categoryId = filters.categoryId
  if (filters.brandId) q.brandId = filters.brandId
  if (filters.supplierId) q.supplierId = filters.supplierId
  if (filters.stock) q.stock = filters.stock
  return q
}

let seq = 0
async function load() {
  const my = ++seq
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await api.get<Paginated<ProductRow>>('/products', { params: queryParams(page.value, PAGE_SIZE) })
    if (my !== seq) return
    items.value = data.items
    total.value = data.total
    totalPages.value = Math.max(1, data.totalPages)
    if (page.value > totalPages.value) page.value = totalPages.value
  } catch (e) {
    if (my !== seq) return
    loadError.value = errorMessage(e, 'Could not load products')
  } finally {
    if (my === seq) loading.value = false
  }
}

async function loadLookups() {
  try {
    const [c, b, u, s, t, x] = await Promise.all([
      api.get<CategoryRow[]>('/categories'), api.get<Named[]>('/brands'), api.get<UnitRow[]>('/units'),
      api.get<SupplierRow[]>('/suppliers'), api.get<Named[]>('/tags'), api.get<TaxCategoryRow[]>('/tax-categories'),
    ])
    categories.value = c.data; brands.value = b.data; units.value = u.data; suppliers.value = s.data; tags.value = t.data; taxCategories.value = x.data
  } catch (e) {
    toast.error(errorMessage(e, 'Could not load categories, brands and suppliers'))
  }
}

const applySearch = useDebounceFn((v: string) => { filters.search = v.trim() }, 350)
watch(searchInput, (v) => applySearch(v))

watch(filters, () => {
  if (page.value !== 1) page.value = 1 // the page watcher reloads
  else load()
})
watch(page, load)

function onSort(s: SortState) {
  sort.value = s && SORTABLE.includes(s.key) ? { sortBy: s.key === 'priceValue' ? 'price' : s.key, sortDir: s.direction } : { sortBy: 'name', sortDir: 'asc' }
  if (page.value !== 1) page.value = 1
  else load()
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

async function setArchived(p: ProductRow, archive: boolean) {
  if (archive) {
    const ok = await confirm({
      heading: 'Archive product?',
      description: `"${p.name}" will be hidden from the POS and the active list. You can restore it later.`,
      confirmLabel: 'Archive',
      destructive: true,
    })
    if (!ok) return
  }
  try {
    await api.post(`/products/${p.id}/${archive ? 'archive' : 'unarchive'}`)
    toast.success(archive ? 'Product archived' : 'Product restored')
    await load()
  } catch (e) {
    toast.error(errorMessage(e, archive ? 'Could not archive the product' : 'Could not restore the product'))
  }
}

function onAction(action: string, row: ProductRow) {
  const p = items.value.find((i) => i.id === row.id) ?? row
  if (action === 'view') { viewing.value = p; detailOpen.value = true }
  else if (action === 'edit') { editing.value = p; formOpen.value = true }
  else if (action === 'archive') setArchived(p, true)
  else if (action === 'restore') setArchived(p, false)
}

async function exportCsv() {
  if (exporting.value) return
  exporting.value = true
  try {
    // The visible page is only a slice; walk every page of the current filter/sort (API max page size is 100).
    const out: ProductRow[] = []
    for (let p = 1, pages = 1; p <= pages; p++) {
      const { data } = await api.get<Paginated<ProductRow>>('/products', { params: queryParams(p, 100) })
      out.push(...data.items)
      pages = data.totalPages
    }
    downloadCsv(
      `products-${filters.status}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['SKU', 'Barcode', 'Name', 'Category', 'Brand', 'Unit', 'Supplier', 'Tax category', 'Tax rate %', 'Cost', 'Price', 'Wholesale price', 'Stock', 'Reorder level', 'Max stock', 'Expiration date', 'Image URL', 'Status'],
      out.map((p) => [
        p.sku, p.barcode, p.name, p.category?.name, p.brand?.name, p.unit?.name, p.supplier?.name,
        p.taxCategory?.name, p.taxCategory ? Number(p.taxCategory.rate).toFixed(2) : '',
        Number(p.cost).toFixed(2), Number(p.price).toFixed(2),
        p.wholesalePrice == null ? '' : Number(p.wholesalePrice).toFixed(2),
        p.stockQty, p.reorderLevel, p.maxStock, p.expirationDate?.slice(0, 10), p.imageUrl, stockStatus(p).label,
      ]),
    )
    toast.success(`Exported ${out.length} product${out.length === 1 ? '' : 's'}`)
  } catch (e) {
    toast.error(errorMessage(e, 'Could not export products'))
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadLookups()
  load()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-xl font-semibold text-fg">Products</h1>
        <p class="text-sm text-fg-muted">{{ total }} {{ total === 1 ? 'product' : 'products' }}</p>
      </div>
      <div class="flex gap-2">
        <LButton icon="download" variant="outline" :loading="exporting" :disabled="loading || !total" @click="exportCsv">Export CSV</LButton>
        <LButton icon="plus" @click="openCreate">New product</LButton>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <LSearchInput v-model="searchInput" class="sm:col-span-2 lg:col-span-1" placeholder="Search name, SKU, barcode" />
      <LSelect v-model="filters.categoryId" :options="categoryOptions" />
      <LSelect v-model="filters.brandId" :options="brandOptions" />
      <LSelect v-model="filters.supplierId" :options="supplierOptions" />
      <LSelect v-model="filters.stock" :options="stockOptions" :disabled="filters.status === 'archived'" />
      <LSelect v-model="filters.status" :options="statusOptions" />
    </div>

    <ErrorState v-if="loadError" heading="Could not load products" :message="loadError" @retry="load" />
    <EmptyState
      v-else-if="!loading && !items.length"
      icon="box"
      :heading="filters.search || filters.categoryId || filters.brandId || filters.supplierId || filters.stock ? 'No products match your filters' : filters.status === 'archived' ? 'No archived products' : 'No products yet'"
      :description="filters.status === 'active' && !filters.search ? 'Create your first product to get started.' : undefined"
    />
    <div v-else class="space-y-3">
      <div class="overflow-x-auto">
        <LTable
          :columns="columns"
          :rows="rows"
          row-key="id"
          :actions="actions"
          :loading="loading"
          :skeleton-rows="8"
          @sort="onSort"
          @action="onAction"
        />
      </div>
      <div v-if="totalPages > 1" class="flex justify-center">
        <LPagination v-model:page="page" :total-pages="totalPages" />
      </div>
    </div>

    <ProductForm
      v-model:open="formOpen"
      :product="editing"
      :categories="categories"
      :brands="brands"
      :units="units"
      :suppliers="suppliers"
      :tax-categories="taxCategories"
      :tags="tags"
      @saved="load"
    />
    <ProductDetail v-model:open="detailOpen" :product="viewing" />
  </div>
</template>
