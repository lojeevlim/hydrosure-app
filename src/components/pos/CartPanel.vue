<script setup lang="ts">
import { ref } from 'vue'
import { useCartStore } from '../../stores/cart'
import { formatMoney } from '../../lib/format'
import LAlert from '../ui/LAlert.vue'
import LBadge from '../ui/LBadge.vue'
import LButton from '../ui/LButton.vue'
import LCard from '../ui/LCard.vue'
import LNumberInput from '../ui/LNumberInput.vue'
import EmptyState from '../ui/EmptyState.vue'
import DiscountEditor from './DiscountEditor.vue'

defineProps<{ busy?: boolean; heldCount: number }>()
const emit = defineEmits<{ pay: []; hold: []; clear: []; showHeld: [] }>()

const cart = useCartStore()
const openDiscount = ref<Set<string>>(new Set())
function toggleDiscount(id: string) {
  const s = new Set(openDiscount.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  openDiscount.value = s
}

/** Typed/stepped quantity; an emptied field (undefined) is ignored until a number is entered. */
function onQty(productId: string, v: number | undefined) {
  if (v !== undefined) cart.setQty(productId, v)
}
</script>

<template>
  <LCard class="block h-full min-h-0" padding="none" aria-label="Cart">
  <section class="flex h-full min-h-0 flex-col" aria-label="Cart">
    <header class="flex items-center gap-2 border-b border-border px-3 py-2">
      <h2 class="text-sm font-semibold">Cart <span class="text-fg-muted">({{ cart.count }})</span></h2>
      <span data-testid="customer"><LBadge label="Customer: Walk-in" size="sm" /></span>
      <div class="ml-auto flex gap-1">
        <LButton size="sm" variant="ghost" icon="clock" data-testid="held-open" @click="emit('showHeld')">{{ heldCount ? `Held (${heldCount})` : 'Held' }}</LButton>
        <LButton v-if="cart.lines.length" size="sm" variant="ghost" icon="trash-2" data-testid="cart-clear" @click="emit('clear')">Clear</LButton>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-auto">
      <EmptyState v-if="!cart.lines.length" heading="Cart is empty" description="Scan a barcode or tap a product." icon="shopping-cart" />
      <ul v-else class="divide-y divide-border">
        <li v-for="(l, i) in cart.lines" :key="l.productId" class="space-y-2 px-3 py-2" data-testid="cart-line">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ l.name }}</p>
              <p class="text-xs text-fg-muted">{{ l.sku }} - {{ formatMoney(l.price / 100) }}</p>
            </div>
            <p class="shrink-0 text-sm font-semibold">{{ formatMoney((cart.totals.lines[i]?.gross ?? 0) / 100) }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="w-36" :aria-label="`Quantity for ${l.name}`" data-testid="qty-input">
              <LNumberInput :model-value="l.qty" :min="1" :step="1" :precision="0" size="sm" @update:model-value="onQty(l.productId, $event)" />
            </div>
            <LButton
              size="sm"
              variant="ghost"
              :aria-expanded="openDiscount.has(l.productId) || !!l.discount"
              @click="toggleDiscount(l.productId)"
            >Discount</LButton>
            <LButton class="ml-auto" size="sm" variant="ghost" icon="x" icon-only :aria-label="`Remove ${l.name}`" data-testid="line-remove" @click="cart.remove(l.productId)" />
          </div>

          <DiscountEditor
            v-if="openDiscount.has(l.productId) || l.discount"
            :model-value="l.discount"
            label="Item discount"
            testid="item-discount"
            @update:model-value="cart.setItemDiscount(l.productId, $event)"
          />
          <p v-if="(cart.totals.lines[i]?.itemDiscount ?? 0) > 0" class="text-xs text-fg-muted">
            Discount -{{ formatMoney((cart.totals.lines[i]?.itemDiscount ?? 0) / 100) }}
          </p>
          <div v-if="l.qty > l.stockQty" role="alert" data-testid="stock-warning">
            <LAlert variant="warning">Only {{ Math.max(l.stockQty, 0) }} in stock. Reduce the quantity to check out.</LAlert>
          </div>
        </li>
      </ul>
    </div>

    <footer class="space-y-2 border-t border-border p-3">
      <DiscountEditor :model-value="cart.txDiscount" label="Cart discount" testid="tx-discount" @update:model-value="cart.setTxDiscount($event)" />
      <dl class="space-y-0.5 text-sm" data-testid="totals">
        <div class="flex justify-between"><dt class="text-fg-muted">Subtotal</dt><dd>{{ formatMoney(cart.totals.subtotal / 100) }}</dd></div>
        <div class="flex justify-between"><dt class="text-fg-muted">Discount</dt><dd>-{{ formatMoney(cart.totals.discountTotal / 100) }}</dd></div>
        <div class="flex justify-between"><dt class="text-fg-muted">Tax</dt><dd>{{ formatMoney(cart.totals.tax / 100) }}</dd></div>
        <div class="flex justify-between pt-1 text-lg font-semibold"><dt>Total</dt><dd data-testid="cart-total">{{ formatMoney(cart.totals.total / 100) }}</dd></div>
      </dl>
      <div class="flex gap-2">
        <LButton variant="outline" icon="clock" :disabled="!cart.lines.length || busy" data-testid="hold" @click="emit('hold')">Hold (F8)</LButton>
        <div class="min-w-0 flex-1">
          <LButton class="w-full" size="lg" :disabled="!cart.canCheckout || busy" :loading="busy" data-testid="pay" @click="emit('pay')">{{ `Pay ${formatMoney(cart.totals.total / 100)} (F4)` }}</LButton>
        </div>
      </div>
      <LAlert v-if="cart.stockIssues.length" variant="error">Fix the stock warnings above to enable checkout.</LAlert>
    </footer>
  </section>
  </LCard>
</template>
