<script setup lang="ts">
import { supplierInputSchema } from '@hydrosure/shared'
import CrudPanel, { type CrudField } from '../components/catalog/CrudPanel.vue'
import type { SupplierRow } from '../components/products/types'
import type { LTableColumn } from '../types/lojee-elements'

const columns: LTableColumn[] = [
  { key: 'name', header: 'Name' },
  { key: 'contactName', header: 'Contact' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'address', header: 'Address' },
]
const fields: CrudField<SupplierRow>[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'contactName', label: 'Contact name' },
  { key: 'email', label: 'Email', kind: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address', kind: 'textarea' },
]
const dash = (v: string | null) => v || '-'
const mapRow = (r: SupplierRow) => ({
  ...r, contactName: dash(r.contactName), email: dash(r.email), phone: dash(r.phone), address: dash(r.address),
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-fg">Suppliers</h1>
    <CrudPanel
      endpoint="/suppliers"
      noun="supplier"
      noun-plural="suppliers"
      :columns="columns"
      :fields="fields"
      :schema="supplierInputSchema"
      :map-row="mapRow"
    />
  </div>
</template>
