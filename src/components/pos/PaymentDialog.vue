<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import type { PaymentInput, PaymentMethod } from '@hydrosure/shared'
import { formatMoney } from '../../lib/format'
import LAlert from '../ui/LAlert.vue'
import LButton from '../ui/LButton.vue'
import LInput from '../ui/LInput.vue'
import LModal from '../ui/LModal.vue'
import LNumberInput from '../ui/LNumberInput.vue'
import LSegmented from '../ui/LSegmented.vue'

const props = defineProps<{ totalCents: number; busy?: boolean; error?: string }>()
const emit = defineEmits<{ submit: [payment: PaymentInput] }>()
const open = defineModel<boolean>('open', { default: false })

const methods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'ewallet', label: 'E-wallet' },
]
const method = ref<PaymentMethod>('cash')
const received = ref<number | undefined>(undefined)
const ref_ = ref('')
const cashEl = useTemplateRef<InstanceType<typeof LNumberInput>>('cashEl')
const refEl = useTemplateRef<InstanceType<typeof LInput>>('refEl')

watch(open, (o) => {
  if (!o) return
  method.value = 'cash'
  received.value = undefined
  ref_.value = ''
  setTimeout(() => cashEl.value?.focus(), 150)
})
watch(method, async () => {
  await nextTick()
  setTimeout(() => (method.value === 'cash' ? cashEl.value : refEl.value)?.focus(), 50)
})

const receivedCents = computed(() => Math.round((received.value ?? 0) * 100))
const changeCents = computed(() => receivedCents.value - props.totalCents)

// Exact, then the next whole 50/100/500/1000 above the total (typical bill denominations).
const quick = computed(() => {
  const t = props.totalCents
  const set = new Set<number>([t])
  for (const step of [5000, 10000, 50000, 100000]) {
    const v = Math.ceil(t / step) * step
    if (v > t) set.add(v)
  }
  return [...set].slice(0, 4)
})

const valid = computed(() => {
  if (props.totalCents < 0) return false
  if (method.value === 'cash') return received.value !== undefined && receivedCents.value >= props.totalCents
  return ref_.value.trim().length > 0
})

function onEnter(e: KeyboardEvent) {
  // Enter on a focused button (quick amounts, Cancel) keeps its own meaning.
  if ((e.composedPath()[0] as HTMLElement | undefined)?.tagName === 'BUTTON') return
  e.preventDefault()
  submit()
}

function submit() {
  if (!valid.value || props.busy) return
  if (method.value === 'cash') {
    emit('submit', { method: 'cash', amount: receivedCents.value / 100 })
  } else {
    emit('submit', { method: method.value, amount: props.totalCents / 100, externalRef: ref_.value.trim() })
  }
}

const methodModel = computed({ get: () => method.value as string, set: (v: string) => (method.value = v as PaymentMethod) })
</script>

<template>
  <LModal v-model:open="open" heading="Payment">
    <div v-if="open" class="flex flex-col gap-4" @keydown.enter="onEnter">
      <div class="flex items-baseline justify-between">
        <span class="text-sm text-fg-muted">Amount due</span>
        <span class="text-2xl font-semibold" data-testid="amount-due">{{ formatMoney(totalCents / 100) }}</span>
      </div>

      <div role="group" aria-label="Payment method" data-testid="methods">
        <LSegmented v-model="methodModel" :options="methods" />
      </div>

      <template v-if="method === 'cash'">
        <div data-testid="cash-received">
          <LNumberInput ref="cashEl" v-model="received" label="Cash received" :min="0" :step="0.01" :precision="2" placeholder="0.00" />
        </div>
        <div class="flex flex-wrap gap-2">
          <LButton
            v-for="q in quick"
            :key="q"
            variant="outline"
            size="sm"
            @click="received = q / 100">{{ q === totalCents ? 'Exact' : formatMoney(q / 100) }}</LButton>
        </div>
        <div class="flex items-baseline justify-between rounded-md bg-surface-muted px-3 py-2">
          <span class="text-sm text-fg-muted">Change</span>
          <span class="text-xl font-semibold" data-testid="change">{{ received !== undefined && changeCents >= 0 ? formatMoney(changeCents / 100) : '-' }}</span>
        </div>
      </template>

      <template v-else>
        <div role="note" data-testid="payment-note">
          <LAlert variant="info">
            Recorded, not verified by a processor. Take the payment on your own terminal, then enter its reference
            here. This system does not process or confirm {{ method === 'card' ? 'card' : 'e-wallet' }} payments.
          </LAlert>
        </div>
        <LInput ref="refEl" v-model="ref_" :label="method === 'card' ? 'Card approval / terminal reference' : 'E-wallet transaction reference'" required placeholder="Reference" />
      </template>

      <div v-if="error" role="alert" data-testid="pay-error"><LAlert variant="error">{{ error }}</LAlert></div>

      <div class="flex justify-end gap-2">
        <LButton variant="outline" :disabled="busy" @click="open = false">Cancel</LButton>
        <LButton :disabled="!valid || busy" :loading="busy" data-testid="pay-confirm" @click="submit">{{ method === 'cash' ? 'Complete sale' : 'Record payment and complete sale' }}</LButton>
      </div>
    </div>
  </LModal>
</template>
