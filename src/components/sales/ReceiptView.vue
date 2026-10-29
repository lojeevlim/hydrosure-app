<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { ReceiptDto } from './types'

const props = defineProps<{ sale: ReceiptDto; storeName?: string }>()

// Placeholder header from env; the receipt endpoint's store name wins when present.
const name = computed(() => props.sale.store?.name ?? props.storeName ?? (import.meta.env.VITE_STORE_NAME as string | undefined) ?? 'Lojee Store')
const address = (import.meta.env.VITE_STORE_ADDRESS as string | undefined) ?? ''

const methodLabel = { cash: 'Cash', card: 'Card', ewallet: 'E-wallet' } as const
const n = (v: string | number | undefined | null) => Number(v ?? 0)
const voided = computed(() => props.sale.status === 'voided')
</script>

<template>
  <article class="mx-auto w-full max-w-sm bg-surface p-4 text-sm text-fg" data-testid="receipt">
    <header class="text-center">
      <h2 class="text-base font-semibold">{{ name }}</h2>
      <p v-if="address" class="text-xs text-fg-muted">{{ address }}</p>
    </header>

    <p v-if="voided" class="mt-3 rounded border border-red-500 p-2 text-center text-xs font-semibold uppercase text-red-600">
      Voided<template v-if="sale.voidReason"> - {{ sale.voidReason }}</template>
    </p>

    <dl class="mt-3 space-y-0.5 text-xs">
      <div class="flex justify-between"><dt class="text-fg-muted">Receipt</dt><dd class="font-medium" data-testid="receipt-no">{{ sale.receiptNo }}</dd></div>
      <div class="flex justify-between"><dt class="text-fg-muted">Date</dt><dd>{{ formatDateTime(sale.createdAt) }}</dd></div>
      <div class="flex justify-between"><dt class="text-fg-muted">Cashier</dt><dd>{{ sale.cashier?.name ?? '-' }}</dd></div>
      <div class="flex justify-between"><dt class="text-fg-muted">Customer</dt><dd>{{ sale.customer?.name ?? 'Walk-in' }}</dd></div>
    </dl>

    <ul class="mt-3 divide-y divide-border border-y border-border">
      <li v-for="it in sale.items ?? []" :key="it.id" class="py-2">
        <div class="flex justify-between gap-2">
          <span class="min-w-0 break-words font-medium">{{ it.name }}</span>
          <span class="shrink-0">{{ formatMoney(n(it.unitPrice) * it.qty) }}</span>
        </div>
        <div class="text-xs text-fg-muted">{{ it.qty }} x {{ formatMoney(it.unitPrice) }}</div>
        <div v-if="n(it.discountAmount) > 0" class="flex justify-between text-xs text-fg-muted">
          <span>Discount</span><span>-{{ formatMoney(it.discountAmount) }}</span>
        </div>
      </li>
    </ul>

    <dl class="mt-3 space-y-0.5">
      <div class="flex justify-between"><dt class="text-fg-muted">Subtotal</dt><dd>{{ formatMoney(sale.subtotal) }}</dd></div>
      <div v-if="n(sale.discountTotal) > 0" class="flex justify-between"><dt class="text-fg-muted">Discount</dt><dd>-{{ formatMoney(sale.discountTotal) }}</dd></div>
      <div class="flex justify-between"><dt class="text-fg-muted">Tax</dt><dd>{{ formatMoney(sale.taxTotal) }}</dd></div>
      <div class="flex justify-between border-t border-border pt-1 text-base font-semibold">
        <dt>Total</dt><dd data-testid="receipt-total">{{ formatMoney(sale.total) }}</dd>
      </div>
    </dl>

    <section v-for="p in sale.payments" :key="p.id" class="mt-3 space-y-0.5 border-t border-border pt-2 text-xs">
      <div class="flex justify-between">
        <span class="text-fg-muted">Payment</span><span class="font-medium">{{ methodLabel[p.method] ?? p.method }}</span>
      </div>
      <template v-if="p.method === 'cash'">
        <div class="flex justify-between"><span class="text-fg-muted">Cash received</span><span>{{ formatMoney(p.tendered) }}</span></div>
        <div class="flex justify-between"><span class="text-fg-muted">Change</span><span data-testid="receipt-change">{{ formatMoney(p.changeGiven) }}</span></div>
      </template>
      <template v-else>
        <div class="flex justify-between"><span class="text-fg-muted">Amount</span><span>{{ formatMoney(p.amount) }}</span></div>
        <div v-if="p.externalRef" class="flex justify-between gap-2"><span class="text-fg-muted">Reference</span><span class="break-all">{{ p.externalRef }}</span></div>
      </template>
      <p v-if="!p.verified" class="text-fg-muted">Unverified: recorded from an external reference, not verified by a processor.</p>
    </section>

    <footer class="mt-4 text-center text-xs text-fg-muted">Thank you!</footer>
  </article>
</template>
