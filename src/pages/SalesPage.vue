<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import type { Paginated } from '@hydrosure/shared'
import { api, errorMessage } from '../lib/api'
import { formatDateTime, formatMoney } from '../lib/format'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import type { LSelectOption, LTableAction, LTableColumn } from '../types/lojee-elements'
import LButton from '../components/ui/LButton.vue'
import LDatePicker from '../components/ui/LDatePicker.vue'
import LModal from '../components/ui/LModal.vue'
import LPagination from '../components/ui/LPagination.vue'
import LSelect from '../components/ui/LSelect.vue'
import LTable from '../components/ui/LTable.vue'
import LTextarea from '../components/ui/LTextarea.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import ReceiptDialog from '../components/sales/ReceiptDialog.vue'
import type { ReceiptDto, SaleDto } from '../components/sales/types'

const auth = useAuthStore()
const toast = useToast()

const rows = ref<SaleDto[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const status = ref('')
const from = ref('')
const to = ref('')
const rangeError = computed(() => (from.value && to.value && from.value > to.value ? 'From must not be after To' : ''))
let seq = 0

const statusOptions: LSelectOption[] = [
  { label: 'All statuses', value: '' },
  { label: 'Completed', value: 'completed' },
  { label: 'Voided', value: 'voided' },
]

async function load() {
  const my = ++seq
  loading.value = true
  error.value = ''
  if (rangeError.value) { rows.value = []; total.value = 0; totalPages.value = 1; loading.value = false; return }
  try {
    const { data } = await api.get<Paginated<SaleDto>>('/sales', {
      params: {
        page: page.value,
        pageSize: 20,
        status: status.value || undefined,
        // Date inputs are local calendar days; send the full local day as UTC instants.
        from: from.value ? new Date(`${from.value}T00:00:00`).toISOString() : undefined,
        to: to.value ? new Date(`${to.value}T23:59:59.999`).toISOString() : undefined,
      },
    })
    if (my !== seq) return
    rows.value = data.items
    totalPages.value = Math.max(1, data.totalPages)
    total.value = data.total
  } catch (e) {
    if (my !== seq) return
    error.value = errorMessage(e, 'Could not load sales')
  } finally {
    if (my === seq) loading.value = false
  }
}
onMounted(load)
watch(page, load)
watch([status, from, to], () => {
  if (page.value !== 1) page.value = 1 // the page watcher reloads
  else load()
})

const methodLabel: Record<string, string> = { cash: 'Cash', card: 'Card', ewallet: 'E-wallet' }
// Table cells cannot hold Vue components, so cells are pre-formatted strings.
const tableRows = computed(() =>
  rows.value.map((s) => ({
    id: s.id,
    receiptNo: s.receiptNo,
    date: formatDateTime(s.createdAt),
    cashier: s.cashier?.name ?? '-',
    payment: s.payments.map((p) => methodLabel[p.method] ?? p.method).join(', ') + (s.payments.some((p) => !p.verified) ? ' (unverified)' : ''),
    total: formatMoney(s.total),
    status: s.status === 'voided' ? 'Voided' : 'Completed',
  })),
)
const columns: LTableColumn[] = [
  { key: 'receiptNo', header: 'Receipt' },
  { key: 'date', header: 'Date' },
  { key: 'cashier', header: 'Cashier' },
  { key: 'payment', header: 'Payment' },
  { key: 'total', header: 'Total', align: 'right' },
  { key: 'status', header: 'Status' },
]
const actions = computed<LTableAction[]>(() => [
  { label: 'Receipt', value: 'view', icon: 'file' },
  ...(auth.isManager ? [{ label: 'Void', value: 'void', icon: 'circle-x' }] : []),
])

// ---- receipt -------------------------------------------------------------------------------
const receiptOpen = ref(false)
const receipt = ref<ReceiptDto | null>(null)
const opening = ref(false)

async function viewReceipt(id: string) {
  if (opening.value) return
  opening.value = true
  try {
    receipt.value = (await api.get<ReceiptDto>(`/sales/${id}/receipt`)).data
    receiptOpen.value = true
  } catch (e) {
    toast.error(errorMessage(e, 'Could not load receipt'))
  } finally {
    opening.value = false
  }
}

// ---- void ----------------------------------------------------------------------------------
const voidTarget = ref<SaleDto | null>(null)
const voidOpen = ref(false)
const reason = ref('')
const voiding = ref(false)
const voidError = ref('')

function askVoid(id: string) {
  const s = rows.value.find((r) => r.id === id)
  if (!s) return
  if (s.status === 'voided') return toast.show(`${s.receiptNo} is already voided`, { variant: 'info', heading: 'Already voided' })
  voidTarget.value = s
  reason.value = ''
  voidError.value = ''
  voidOpen.value = true
}
async function confirmVoid() {
  const s = voidTarget.value
  if (!s || voiding.value) return
  if (!reason.value.trim()) { voidError.value = 'A reason is required'; return }
  voiding.value = true
  voidError.value = ''
  try {
    await api.post(`/sales/${s.id}/void`, { reason: reason.value.trim() })
    voidOpen.value = false
    toast.success(`${s.receiptNo} voided and stock returned`)
    load()
  } catch (e) {
    const code = axios.isAxiosError(e) ? e.response?.status : undefined
    if (code === 403) { voidError.value = 'Only managers and admins can void sales.'; return }
    if (code === 409) {
      voidError.value = errorMessage(e, 'Sale is already voided')
      load()
      return
    }
    voidError.value = errorMessage(e, 'Could not void sale')
  } finally {
    voiding.value = false
  }
}

function onAction(action: string, row: { id: string }) {
  if (action === 'view') viewReceipt(row.id)
  else if (action === 'void') askVoid(row.id)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end gap-3">
      <div class="w-44"><LSelect v-model="status" label="Status" :options="statusOptions" /></div>
      <div class="w-full sm:w-52" data-testid="date-from"><LDatePicker v-model="from" label="From" /></div>
      <div class="w-full sm:w-52" data-testid="date-to"><LDatePicker v-model="to" label="To" :error="rangeError" /></div>
      <LButton v-if="status || from || to" variant="ghost" @click="status = ''; from = ''; to = ''">Reset</LButton>
      <p class="ml-auto text-xs text-fg-muted">
        <template v-if="auth.role === 'cashier'">Showing your sales only. </template>{{ total }} sale(s)
      </p>
    </div>

    <ErrorState v-if="error" heading="Could not load sales" :message="error" @retry="load" />
    <template v-else>
      <div class="overflow-x-auto" data-testid="sales-table">
        <LTable
          :columns="columns"
          :rows="tableRows"
          row-key="id"
          :actions="actions"
          :loading="loading"
          empty-message="No sales match these filters"
          @action="onAction"
        />
      </div>
      <div v-if="totalPages > 1" class="flex justify-center"><LPagination v-model:page="page" :total-pages="totalPages" /></div>
    </template>

    <ReceiptDialog v-model:open="receiptOpen" :sale="receipt" />

    <LModal v-model:open="voidOpen" :heading="`Void ${voidTarget?.receiptNo ?? 'sale'}`">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-fg-muted">
          This returns all items to stock and marks the sale voided. Card and e-wallet refunds are not handled here.
        </p>
        <LTextarea v-model="reason" label="Reason (required)" :rows="3" :error="voidError" />
        <div class="flex justify-end gap-2">
          <LButton variant="outline" :disabled="voiding" @click="voidOpen = false">Cancel</LButton>
          <LButton variant="destructive" :loading="voiding" :disabled="voiding" data-testid="void-confirm" @click="confirmVoid">Void sale</LButton>
        </div>
      </div>
    </LModal>
  </div>
</template>
