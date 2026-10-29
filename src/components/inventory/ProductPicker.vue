<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import LInput from '../ui/LInput.vue'
import LSelect from '../ui/LSelect.vue'
import { api } from '../../lib/api'
import type { LSelectOption } from '../../types/lojee-elements'

// Server-side product search (the catalog can exceed one page) feeding a select.
const props = defineProps<{
  label?: string
  error?: string
  allowAll?: boolean
  /** Product to keep in the option list even when the search results change (e.g. the one picked from a table row). */
  seed?: { id: string; sku: string; name: string } | null
}>()
const model = defineModel<string>({ default: '' })

const search = ref('')
const found = ref<{ id: string; sku: string; name: string }[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<{ items: { id: string; sku: string; name: string }[] }>('/products', {
      params: { search: search.value || undefined, pageSize: 20 },
    })
    found.value = data.items
  } catch {
    found.value = []
  } finally {
    loading.value = false
  }
}
const debounced = useDebounceFn(load, 250)
watch(search, debounced)
load()

const options = computed<LSelectOption[]>(() => {
  const list = [...found.value]
  const extra = [props.seed, ...selectedExtra.value].filter((p): p is { id: string; sku: string; name: string } => !!p)
  for (const p of extra) if (!list.some((i) => i.id === p.id)) list.unshift(p)
  const opts = list.map((p) => ({ label: `${p.sku} - ${p.name}`, value: p.id }))
  return props.allowAll ? [{ label: 'All products', value: '' }, ...opts] : opts
})
// Keep the chosen product visible after the search text changes.
const selectedExtra = ref<{ id: string; sku: string; name: string }[]>([])
watch(model, (id) => {
  const p = found.value.find((i) => i.id === id)
  if (p && !selectedExtra.value.some((i) => i.id === id)) selectedExtra.value = [p]
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <LInput v-model="search" :label="label" placeholder="Search products by name, SKU or barcode" leading-icon="search" />
    <LSelect v-model="model" :options="options" :error="error" :placeholder="loading ? 'Searching...' : 'Select a product'" />
  </div>
</template>
