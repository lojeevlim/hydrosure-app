<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import {
  adjustmentInputSchema,
  openingBalanceInputSchema,
  receiptInputSchema,
  writeOffInputSchema,
} from '@hydrosure/shared'
import LModal from '../ui/LModal.vue'
import LNumberInput from '../ui/LNumberInput.vue'
import LSelect from '../ui/LSelect.vue'
import LSegmented from '../ui/LSegmented.vue'
import LTextarea from '../ui/LTextarea.vue'
import LButton from '../ui/LButton.vue'
import ProductPicker from './ProductPicker.vue'
import { api, errorMessage } from '../../lib/api'
import { useToast } from '../../composables/useToast'
import { apiFieldErrors, fieldErrors } from '../products/formErrors'
import type { StockAction } from './types'

const props = defineProps<{
  action: StockAction
  product: { id: string; sku: string; name: string } | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const meta: Record<StockAction, { title: string; endpoint: string; hint: string; reasonRequired: boolean }> = {
  receive: { title: 'Receive stock', endpoint: '/inventory/receipts', hint: 'Adds stock from a delivery or supplier.', reasonRequired: false },
  adjust: { title: 'Adjust stock', endpoint: '/inventory/adjustments', hint: 'Correction after a count: choose whether to add or remove stock, then enter how many.', reasonRequired: true },
  waste: { title: 'Record damage / expired / waste', endpoint: '/inventory/write-offs', hint: 'Removes stock that can no longer be sold.', reasonRequired: true },
  opening: { title: 'Opening balance', endpoint: '/inventory/opening-balance', hint: 'Adds starting stock for a product (recorded as an opening_balance movement).', reasonRequired: false },
}

const labels: Record<string, string> = {
  productId: 'Product', qty: 'Quantity', qtyChange: 'Quantity change', unitCost: 'Unit cost', reason: 'Reason', type: 'Type',
}
const wasteTypes = [
  { label: 'Damage', value: 'damage' },
  { label: 'Expired', value: 'expired' },
  { label: 'Waste', value: 'waste' },
]

const form = reactive<{ productId: string; qty: number | undefined; qtyChange: number | undefined; unitCost: number | undefined; reason: string; wasteType: string }>({
  productId: '', qty: undefined, qtyChange: undefined, unitCost: undefined, reason: '', wasteType: 'damage',
})
// The sign of an adjustment is chosen separately (positive quantity, sign applied in buildBody).
const adjustDir = ref<'add' | 'remove'>('add')
const dirOptions = [
  { label: 'Add stock', value: 'add' },
  { label: 'Remove stock', value: 'remove' },
]
// Product search, product select and reason textarea (l-input/l-select/l-textarea) keep their own visible text and do not
// follow a model reset, so the form is remounted each time the dialog opens.
const formKey = ref(0)
const errors = reactive<Record<string, string>>({})
const saving = ref(false)
const m = computed(() => meta[props.action])

watch(open, (v) => {
  if (!v) return
  formKey.value++
  adjustDir.value = 'add'
  Object.assign(form, { productId: props.product?.id ?? '', qty: undefined, qtyChange: undefined, unitCost: undefined, reason: '', wasteType: 'damage' })
  for (const k of Object.keys(errors)) delete errors[k]
})

function buildBody(): { ok: true; body: object } | { ok: false; errs: Record<string, string> } {
  const reason = form.reason.trim() || undefined
  const productId = form.productId
  const r =
    props.action === 'receive'
      ? receiptInputSchema.safeParse({ productId, qty: form.qty, unitCost: form.unitCost, reason })
      : props.action === 'opening'
        ? openingBalanceInputSchema.safeParse({ productId, qty: form.qty, reason })
        : props.action === 'adjust'
          ? adjustmentInputSchema.safeParse({ productId, qtyChange: form.qtyChange === undefined ? undefined : adjustDir.value === 'remove' ? -form.qtyChange : form.qtyChange, reason })
          : writeOffInputSchema.safeParse({
              productId,
              type: form.wasteType === 'damage' ? 'damage' : 'waste',
              qty: form.qty,
              // The API has damage|waste only; "expired" is recorded as waste with the reason tagged.
              reason: reason ? (form.wasteType === 'expired' ? `Expired: ${reason}` : reason) : undefined,
            })
  if (r.success) return { ok: true, body: r.data }
  const errs = fieldErrors(r.error, labels)
  if (errs.productId) errs.productId = 'Select a product'
  return { ok: false, errs }
}

async function submit() {
  if (saving.value) return
  for (const k of Object.keys(errors)) delete errors[k]
  const built = buildBody()
  if (!built.ok) {
    Object.assign(errors, built.errs)
    return
  }
  saving.value = true
  try {
    const { data } = await api.post<{ qtyBefore: number; qtyAfter: number; qtyChange: number }>(m.value.endpoint, built.body)
    toast.success(`${m.value.title}: stock ${data.qtyBefore} to ${data.qtyAfter} (${data.qtyChange > 0 ? '+' : ''}${data.qtyChange})`)
    open.value = false
    emit('saved')
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 409) {
      const d = (e.response.data as { error?: { details?: { available?: number } } }).error?.details
      const msg = d?.available !== undefined
        ? `Insufficient stock: only ${d.available} on hand, so that much cannot be removed.`
        : 'Insufficient stock for this change.'
      errors[props.action === 'adjust' ? 'qtyChange' : 'qty'] = msg
      toast.error(msg, 'Insufficient stock')
    } else {
      const fe = apiFieldErrors(e, labels)
      if (Object.keys(fe).length) Object.assign(errors, fe)
      else toast.error(errorMessage(e, 'Could not record the stock change'))
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <LModal v-model:open="open" :heading="m.title">
    <form :key="formKey" class="flex w-full min-w-0 flex-col gap-3 sm:min-w-[24rem]" novalidate @submit.prevent="submit">
      <p class="text-sm text-fg-muted">{{ m.hint }}</p>
      <ProductPicker v-model="form.productId" label="Product" :seed="product" :error="errors.productId" />
      <LSelect v-if="action === 'waste'" v-model="form.wasteType" label="Type" :options="wasteTypes" />
      <LSegmented v-if="action === 'adjust'" v-model="adjustDir" :options="dirOptions" />
      <LNumberInput
        v-if="action === 'adjust'"
        v-model="form.qtyChange"
        :label="adjustDir === 'remove' ? 'Quantity to remove' : 'Quantity to add'"
        placeholder="0"
        :min="0"
        :error="errors.qtyChange"
      />
      <LNumberInput
        v-else
        v-model="form.qty"
        :label="action === 'waste' ? 'Quantity to remove' : 'Quantity'"
        placeholder="0"
        :min="0"
        :error="errors.qty"
      />
      <LNumberInput
        v-if="action === 'receive'"
        v-model="form.unitCost"
        label="Unit cost (optional, updates product cost)"
        :precision="2"
        :min="0"
        placeholder="0.00"
        :error="errors.unitCost"
      />
      <LTextarea
        v-model="form.reason"
        :label="m.reasonRequired ? 'Reason (required)' : 'Reason (optional)'"
        :rows="2"
        :error="errors.reason"
      />
      <div class="flex justify-end gap-2 pt-1">
        <LButton variant="outline" :disabled="saving" @click="open = false">Cancel</LButton>
        <LButton :loading="saving" @click="submit">{{ m.title.split(' / ')[0] }}</LButton>
      </div>
    </form>
  </LModal>
</template>
