<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { productBaseSchema, productCreateSchema } from '@hydrosure/shared'
import LModal from '../ui/LModal.vue'
import LInput from '../ui/LInput.vue'
import LNumberInput from '../ui/LNumberInput.vue'
import LDatePicker from '../ui/LDatePicker.vue'
import LSelect from '../ui/LSelect.vue'
import LTextarea from '../ui/LTextarea.vue'
import LButton from '../ui/LButton.vue'
import { api, errorMessage } from '../../lib/api'
import { useToast } from '../../composables/useToast'
import { apiFieldErrors, fieldErrors } from './formErrors'
import type { CategoryRow, Named, ProductRow, SupplierRow, TaxCategoryRow, UnitRow } from './types'

const props = defineProps<{
  product: ProductRow | null
  categories: CategoryRow[]
  brands: Named[]
  units: UnitRow[]
  suppliers: SupplierRow[]
  taxCategories: TaxCategoryRow[]
  tags: Named[]
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const labels: Record<string, string> = {
  sku: 'SKU', barcode: 'Barcode', name: 'Name', cost: 'Cost', price: 'Price',
  reorderLevel: 'Reorder level',
  wholesalePrice: 'Wholesale price', maxStock: 'Max stock', expirationDate: 'Expiration date', imageUrl: 'Image URL',
  taxCategoryId: 'Tax category', openingQty: 'Opening stock', description: 'Description',
}

const blank = () => ({
  name: '', sku: '', barcode: '', description: '', categoryId: '', brandId: '', unitId: '', supplierId: '', taxCategoryId: '',
  cost: 0 as number | undefined, price: undefined as number | undefined, wholesalePrice: undefined as number | undefined,
  reorderLevel: 0 as number | undefined, maxStock: undefined as number | undefined, expirationDate: '', imageUrl: '',
  openingQty: 0 as number | undefined, tagIds: [] as string[],
})
// LDatePicker keeps its own text, so remount it whenever the dialog is (re)opened.
const formKey = ref(0)
const form = reactive(blank())
const errors = reactive<Record<string, string>>({})
const saving = ref(false)
const isEdit = computed(() => !!props.product)

watch(open, (v) => {
  if (!v) return
  formKey.value++
  for (const k of Object.keys(errors)) delete errors[k]
  const p = props.product
  Object.assign(form, blank(), p && {
    name: p.name, sku: p.sku, barcode: p.barcode ?? '', description: p.description ?? '',
    categoryId: p.categoryId ?? '', brandId: p.brandId ?? '', unitId: p.unitId ?? '', supplierId: p.supplierId ?? '', taxCategoryId: p.taxCategoryId ?? '',
    wholesalePrice: p.wholesalePrice == null ? undefined : Number(p.wholesalePrice),
    maxStock: p.maxStock == null ? undefined : p.maxStock,
    expirationDate: p.expirationDate ? p.expirationDate.slice(0, 10) : '', imageUrl: p.imageUrl ?? '',
    cost: Number(p.cost), price: Number(p.price), reorderLevel: p.reorderLevel,
    tagIds: p.tags.map((t) => t.id),
  })
})

const none = { label: 'None', value: '' }
const catOptions = computed(() => {
  const byId = new Map(props.categories.map((c) => [c.id, c]))
  return [none, ...props.categories.map((c) => ({
    label: c.parentId && byId.get(c.parentId) ? `${byId.get(c.parentId)!.name} / ${c.name}` : c.name,
    value: c.id,
  })).sort((a, b) => a.label.localeCompare(b.label))]
})
const brandOptions = computed(() => [none, ...props.brands.map((b) => ({ label: b.name, value: b.id }))])
const unitOptions = computed(() => [none, ...props.units.map((u) => ({ label: `${u.name} (${u.abbreviation})`, value: u.id }))])
const supplierOptions = computed(() => [none, ...props.suppliers.map((s) => ({ label: s.name, value: s.id }))])

const taxOptions = computed(() => [
  { label: 'None (0%)', value: '' },
  ...props.taxCategories.map((t) => ({ label: `${t.name} (${Number(t.rate)}%)`, value: t.id })),
])
const selectedTax = computed(() => props.taxCategories.find((t) => t.id === form.taxCategoryId) ?? null)

function toggleTag(id: string) {
  const i = form.tagIds.indexOf(id)
  if (i >= 0) form.tagIds.splice(i, 1)
  else form.tagIds.push(id)
}

async function submit() {
  if (saving.value) return
  for (const k of Object.keys(errors)) delete errors[k]
  const payload = {
    name: form.name, sku: form.sku, barcode: form.barcode.trim() || null, description: form.description.trim() || null,
    categoryId: form.categoryId || null, brandId: form.brandId || null, unitId: form.unitId || null,
    supplierId: form.supplierId || null, taxCategoryId: form.taxCategoryId || null,
    cost: form.cost, price: form.price, reorderLevel: form.reorderLevel,
    wholesalePrice: form.wholesalePrice ?? null, maxStock: form.maxStock ?? null,
    expirationDate: form.expirationDate.trim() || null, imageUrl: form.imageUrl.trim() || null,
    tagIds: form.tagIds,
    ...(isEdit.value ? {} : { openingQty: form.openingQty }),
  }
  const parsed = (isEdit.value ? productBaseSchema : productCreateSchema).safeParse(payload)
  if (!parsed.success) {
    Object.assign(errors, fieldErrors(parsed.error, labels))
    return
  }
  saving.value = true
  try {
    if (props.product) await api.patch(`/products/${props.product.id}`, parsed.data)
    else await api.post('/products', parsed.data)
    toast.success(isEdit.value ? 'Product updated' : 'Product created')
    open.value = false
    emit('saved')
  } catch (e) {
    const fe = apiFieldErrors(e, labels)
    if (Object.keys(fe).length) Object.assign(errors, fe)
    else toast.error(errorMessage(e, 'Could not save the product'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <LModal v-model:open="open" :heading="isEdit ? 'Edit product' : 'New product'">
    <form class="max-h-[65vh] w-[min(40rem,85vw)] space-y-4 overflow-y-auto p-1" novalidate @submit.prevent="submit">
      <LInput v-model="form.name" label="Name" required placeholder="Product name" :error="errors.name" />
      <div class="grid gap-4 sm:grid-cols-2">
        <LInput v-model="form.sku" label="SKU" required :error="errors.sku" />
        <LInput v-model="form.barcode" label="Barcode" :error="errors.barcode" />
      </div>
      <LTextarea v-model="form.description" label="Description" :rows="3" :error="errors.description" />
      <div class="grid gap-4 sm:grid-cols-2">
        <LSelect v-model="form.categoryId" label="Category" :options="catOptions" :error="errors.categoryId" />
        <LSelect v-model="form.brandId" label="Brand" :options="brandOptions" :error="errors.brandId" />
        <LSelect v-model="form.unitId" label="Unit" :options="unitOptions" :error="errors.unitId" />
        <LSelect v-model="form.supplierId" label="Supplier" :options="supplierOptions" :error="errors.supplierId" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <LSelect v-model="form.taxCategoryId" label="Tax category" :options="taxOptions" :error="errors.taxCategoryId" />
          <p class="mt-1 text-xs text-fg-muted" data-testid="tax-rate">
            Tax rate: {{ selectedTax ? `${Number(selectedTax.rate)}%` : '0% (no tax category)' }}
          </p>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <LNumberInput v-model="form.cost" label="Cost" :min="0" :precision="2" :error="errors.cost" />
        <LNumberInput v-model="form.price" label="Price" :min="0" :precision="2" :error="errors.price" />
        <LNumberInput v-model="form.wholesalePrice" label="Wholesale price" :min="0" :precision="2" :error="errors.wholesalePrice" />
        <LNumberInput v-model="form.reorderLevel" label="Reorder level" :min="0" :precision="0" :error="errors.reorderLevel" />
        <LNumberInput v-model="form.maxStock" label="Max stock" :min="0" :precision="0" :error="errors.maxStock" />
        <LDatePicker :key="formKey" v-model="form.expirationDate" label="Expiration date" :error="errors.expirationDate" />
      </div>
      <LInput v-model="form.imageUrl" label="Image URL" placeholder="https://example.com/photo.jpg" :error="errors.imageUrl" />
      <LNumberInput
        v-if="!isEdit"
       
        v-model="form.openingQty"
        label="Opening stock"
        :min="0"
        :precision="0"
        :error="errors.openingQty"
      />
      <p v-else class="text-xs text-fg-muted">Stock quantity is changed from Inventory (receipts and adjustments), not here.</p>
      <div v-if="tags.length">
        <p class="mb-1 text-sm font-medium text-fg">Tags</p>
        <div class="flex flex-wrap gap-2">
          <LButton
            v-for="t in tags"
            :key="t.id"
           
            size="sm"
            :variant="form.tagIds.includes(t.id) ? 'solid' : 'outline'"
            @click="toggleTag(t.id)"
          >{{ t.name }}</LButton>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <LButton variant="outline" :disabled="saving" @click="open = false">Cancel</LButton>
        <LButton :loading="saving" @click="submit">{{ isEdit ? 'Save changes' : 'Create product' }}</LButton>
      </div>
    </form>
  </LModal>
</template>
