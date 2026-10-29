<script setup lang="ts">
import { computed, ref } from 'vue'
import { brandInputSchema, categoryInputSchema, tagInputSchema, taxCategoryInputSchema, unitInputSchema } from '@hydrosure/shared'
import CrudPanel, { type CrudField } from '../components/catalog/CrudPanel.vue'
import LTabs from '../components/ui/LTabs.vue'
import type { CategoryRow, Named, TaxCategoryRow, UnitRow } from '../components/products/types'
import type { LTableColumn } from '../types/lojee-elements'

const tabs = [
  { id: 'categories', label: 'Categories' },
  { id: 'brands', label: 'Brands' },
  { id: 'units', label: 'Units' },
  { id: 'tags', label: 'Tags' },
  { id: 'tax', label: 'Tax' },
] as const
const tabLabels = tabs.map((t) => ({ label: t.label }))
const tabIndex = ref(0)
const tab = computed(() => tabs[tabIndex.value]?.id ?? 'categories')

const nameCol: LTableColumn = { key: 'name', header: 'Name' }

// Categories: parent select excludes the row itself and its descendants (no cycles).
const categoryColumns: LTableColumn[] = [nameCol, { key: 'parentName', header: 'Parent category' }]
const categoryFields: CrudField<CategoryRow>[] = [
  { key: 'name', label: 'Name', required: true },
  {
    key: 'parentId',
    label: 'Parent category',
    kind: 'select',
    options: (rows, editing) => {
      const blocked = new Set<string>()
      if (editing) {
        blocked.add(editing.id)
        for (let grew = true; grew; ) {
          grew = false
          for (const r of rows) {
            if (r.parentId && blocked.has(r.parentId) && !blocked.has(r.id)) { blocked.add(r.id); grew = true }
          }
        }
      }
      return [
        { label: 'None (top level)', value: '' },
        ...rows.filter((r) => !blocked.has(r.id)).map((r) => ({ label: r.name, value: r.id })),
      ]
    },
  },
]
const mapCategory = (r: CategoryRow, all: CategoryRow[]) => ({
  ...r, parentName: all.find((c) => c.id === r.parentId)?.name ?? '-',
})

const unitColumns: LTableColumn[] = [nameCol, { key: 'abbreviation', header: 'Abbreviation' }]
const unitFields: CrudField<UnitRow>[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'abbreviation', label: 'Abbreviation', required: true },
]
const taxColumns: LTableColumn[] = [nameCol, { key: 'rateText', header: 'Rate', align: 'right' }]
const taxFields: CrudField<TaxCategoryRow>[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'rate', label: 'Rate (%)', required: true },
]
const mapTax = (r: TaxCategoryRow) => ({ ...r, rateText: `${Number(r.rate).toFixed(2)}%` })
const nameFields: CrudField<Named>[] = [{ key: 'name', label: 'Name', required: true }]
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-fg">Categories &amp; Brands</h1>
    <LTabs v-model:index="tabIndex" :tabs="tabLabels" />

    <CrudPanel v-if="tab === 'categories'" key="categories" endpoint="/categories" noun="category" noun-plural="categories"
      :columns="categoryColumns" :fields="categoryFields" :schema="categoryInputSchema" :map-row="mapCategory" />
    <CrudPanel v-else-if="tab === 'brands'" key="brands" endpoint="/brands" noun="brand" noun-plural="brands"
      :columns="[nameCol]" :fields="nameFields" :schema="brandInputSchema" />
    <CrudPanel v-else-if="tab === 'units'" key="units" endpoint="/units" noun="unit" noun-plural="units"
      :columns="unitColumns" :fields="unitFields" :schema="unitInputSchema" />
    <CrudPanel v-else-if="tab === 'tags'" key="tags" endpoint="/tags" noun="tag" noun-plural="tags"
      :columns="[nameCol]" :fields="nameFields" :schema="tagInputSchema" />
    <CrudPanel v-else key="tax" endpoint="/tax-categories" noun="tax category" noun-plural="tax categories"
      :columns="taxColumns" :fields="taxFields" :schema="taxCategoryInputSchema" :map-row="mapTax" />
  </div>
</template>
