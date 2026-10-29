<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { DashboardData } from '@hydrosure/shared'
import LButton from '../components/ui/LButton.vue'
import LStat from '../components/ui/LStat.vue'
import LTabs from '../components/ui/LTabs.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import StockTab from '../components/inventory/StockTab.vue'
import MovementsTab from '../components/inventory/MovementsTab.vue'
import StockActionDialog from '../components/inventory/StockActionDialog.vue'
import type { StockAction, StockProduct } from '../components/inventory/types'
import { api } from '../lib/api'
import { formatMoney } from '../lib/format'

const route = useRoute()
const qStatus = route.query.status
const initialStatus = qStatus === 'low' || qStatus === 'out' ? qStatus : 'all'

const tabIndex = ref(0)
const stockTab = ref<InstanceType<typeof StockTab> | null>(null)
const movementsTab = ref<InstanceType<typeof MovementsTab> | null>(null)

const summary = ref<DashboardData['inventory'] | null>(null)
const summaryLoading = ref(true)
const summaryError = ref(false)

async function loadSummary() {
  summaryLoading.value = true
  summaryError.value = false
  try {
    const { data } = await api.get<DashboardData>('/dashboard')
    summary.value = data.inventory
  } catch {
    summaryError.value = true
  } finally {
    summaryLoading.value = false
  }
}

const dialogOpen = ref(false)
const dialogAction = ref<StockAction>('receive')
const dialogProduct = ref<{ id: string; sku: string; name: string } | null>(null)

function openDialog(action: StockAction, product: StockProduct | null = null) {
  dialogAction.value = action
  dialogProduct.value = product ? { id: product.id, sku: product.sku, name: product.name } : null
  dialogOpen.value = true
}
function onSaved() {
  loadSummary()
  stockTab.value?.reload()
  movementsTab.value?.reload()
}

const tabs = [{ label: 'Stock levels' }, { label: 'Movement history' }]

onMounted(loadSummary)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-xl font-semibold text-fg">Inventory</h2>
        <p class="text-sm text-fg-muted">Stock levels, movements and adjustments</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <LButton @click="openDialog('receive')">Receive stock</LButton>
        <LButton variant="outline" @click="openDialog('adjust')">Adjust</LButton>
        <LButton variant="outline" @click="openDialog('waste')">Damage / waste</LButton>
        <LButton variant="outline" @click="openDialog('opening')">Opening balance</LButton>
      </div>
    </div>

    <div class="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-4">
      <LStat label="Inventory valuation" :value="summary?.valuation != null ? formatMoney(summary.valuation) : '-'" hint="Sum of on-hand x unit cost" :loading="summaryLoading" />
      <LStat label="Active SKUs" :value="String(summary?.activeSkus ?? '-')" :hint="summary ? `${summary.totalProducts} products incl. archived` : undefined" :loading="summaryLoading" />
      <LStat label="Low stock" :value="String(summary?.lowStockCount ?? '-')" tone="warn" icon="triangle-alert" hint="At or below reorder level" :loading="summaryLoading" />
      <LStat label="Out of stock" :value="String(summary?.outOfStockCount ?? '-')" tone="danger" icon="circle-x" hint="On hand is 0" :loading="summaryLoading" />
    </div>
    <ErrorState v-if="summaryError" heading="Could not load the summary" @retry="loadSummary" />

    <LTabs v-model:index="tabIndex" :tabs="tabs" />

    <StockTab v-show="tabIndex === 0" ref="stockTab" :initial-status="initialStatus" @action="(a, p) => openDialog(a, p)" />
    <MovementsTab v-show="tabIndex === 1" ref="movementsTab" />

    <StockActionDialog v-model:open="dialogOpen" :action="dialogAction" :product="dialogProduct" @saved="onSaved" />
  </div>
</template>
