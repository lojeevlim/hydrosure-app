<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useElementSize, useEventListener, useMediaQuery, watchDebounced } from '@vueuse/core'
import axios from 'axios'
import { Package } from 'lucide-vue-next'
import { checkoutSchema, heldCartInputSchema, type PaymentInput } from '@hydrosure/shared'
import { api, errorMessage } from '../lib/api'
import { formatMoney } from '../lib/format'
import { useCartStore, type CartProduct } from '../stores/cart'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { useBarcodeScanner } from '../composables/useBarcodeScanner'
import LBadge from '../components/ui/LBadge.vue'
import LButton from '../components/ui/LButton.vue'
import LDivider from '../components/ui/LDivider.vue'
import LCard from '../components/ui/LCard.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import LSearchInput from '../components/ui/LSearchInput.vue'
import LSegmented from '../components/ui/LSegmented.vue'
import LTabs from '../components/ui/LTabs.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import CartPanel from '../components/pos/CartPanel.vue'
import PaymentDialog from '../components/pos/PaymentDialog.vue'
import HeldCartsDialog, { type HeldCartDto } from '../components/pos/HeldCartsDialog.vue'
import ReceiptDialog from '../components/sales/ReceiptDialog.vue'
import type { SaleDto } from '../components/sales/types'

interface ProductDto extends CartProduct {
  reorderLevel: number
  imageUrl?: string | null
}
interface Page<T> { items: T[]; page: number; totalPages: number; total: number }

const PAGE_SIZE = 48
const cart = useCartStore()
const toast = useToast()
const confirm = useConfirm()

// ---- catalog -------------------------------------------------------------------------------
const products = ref<ProductDto[]>([])
const loading = ref(true)
const loadError = ref('')
const page = ref(1)
const totalPages = ref(1)
const search = ref('')
const categoryId = ref('')
const categories = ref<{ id: string; name: string }[]>([])
const searchEl = useTemplateRef<InstanceType<typeof LSearchInput>>('searchEl')
let fetchSeq = 0

async function loadProducts(reset = true) {
  const seq = ++fetchSeq
  if (reset) { page.value = 1; loading.value = true }
  loadError.value = ''
  try {
    const { data } = await api.get<Page<ProductDto>>('/products', {
      params: {
        search: search.value.trim() || undefined,
        categoryId: categoryId.value || undefined,
        page: reset ? 1 : page.value + 1,
        pageSize: PAGE_SIZE,
      },
    })
    if (seq !== fetchSeq) return // a newer search superseded this one
    products.value = reset ? data.items : [...products.value, ...data.items]
    page.value = data.page
    totalPages.value = data.totalPages
    cart.syncProducts(data.items)
  } catch (e) {
    if (seq !== fetchSeq) return
    loadError.value = errorMessage(e, 'Could not load products')
  } finally {
    if (seq === fetchSeq) loading.value = false
  }
}
watchDebounced(search, () => loadProducts(), { debounce: 300 })
watch(categoryId, () => loadProducts())

/** Re-reads the cart's products so stock/price warnings are current. */
async function refreshCartStock() {
  const ids = cart.lines.map((l) => l.productId)
  const res = await Promise.allSettled(ids.map((id) => api.get<ProductDto>(`/products/${id}`)))
  const fresh: CartProduct[] = []
  res.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const p = r.value.data
      fresh.push(p.archivedAt ? { ...p, stockQty: 0 } : p) // archived products cannot be sold
    } else if (axios.isAxiosError(r.reason) && r.reason.response?.status === 404) {
      const l = cart.lines.find((x) => x.productId === ids[i])
      if (l) fresh.push({ id: l.productId, sku: l.sku, name: l.name, price: l.price / 100, stockQty: 0 })
    }
  })
  cart.syncProducts(fresh)
}

function addToCart(p: CartProduct) {
  if (p.stockQty <= 0) {
    toast.show(`${p.name} is out of stock`, { variant: 'warning', heading: 'Out of stock' })
    return
  }
  cart.add(p)
  const l = cart.lines.find((x) => x.productId === p.id)
  if (l && l.qty > l.stockQty) toast.show(`Only ${l.stockQty} of ${p.name} in stock`, { variant: 'warning', heading: 'Stock limit' })
}

function clearSearchBox() {
  search.value = ''
  searchEl.value?.clear()
}

// ---- barcode -------------------------------------------------------------------------------
async function onScan(code: string) {
  try {
    const byBarcode = await api.get<Page<ProductDto>>('/products', { params: { barcode: code, pageSize: 1 } })
    let hit: ProductDto | undefined = byBarcode.data.items[0]
    if (!hit) {
      const bySku = await api.get<Page<ProductDto>>('/products', { params: { search: code, pageSize: 20 } })
      hit = bySku.data.items.find((p) => p.sku.toLowerCase() === code.toLowerCase())
    }
    if (hit) addToCart(hit)
    else toast.show(`No product matches "${code}"`, { variant: 'warning', heading: 'Not found' })
  } catch (e) {
    toast.error(errorMessage(e, 'Scan lookup failed'))
  } finally {
    // The wedge also typed the code into a focused search box; clear it once the input events have settled.
    if (search.value && search.value.endsWith(code)) clearSearchBox()
  }
}

// ---- dialogs / state -----------------------------------------------------------------------
const payOpen = ref(false)
const heldOpen = ref(false)
const receiptOpen = ref(false)
const anyDialog = computed(() => payOpen.value || heldOpen.value || receiptOpen.value)
useBarcodeScanner(onScan, { enabled: () => !anyDialog.value })

const isLarge = useMediaQuery('(min-width: 1024px)')
const mobileView = ref<'products' | 'cart'>('products')
const mobileTab = computed({ get: () => (mobileView.value === 'cart' ? 1 : 0), set: (i: number) => (mobileView.value = i === 1 ? 'cart' : 'products') })
const mobileTabs = computed(() => [
  { label: 'Products' },
  { label: `Cart (${cart.count}) - ${formatMoney(cart.totals.total / 100)}` },
])
const categoryOptions = computed(() => [{ label: 'All', value: '' }, ...categories.value.map((c) => ({ label: c.name, value: c.id }))])

// ---- resizable cart pane -------------------------------------------------------------------
// The divider reports pixel deltas only; the page owns the cart width (px), clamped to [300px, 55% of the split].
const CART_KEY = 'hydrosure.pos.cartWidth'
const CART_DEFAULT = 384 // 24rem, the previous fixed width
const CART_MIN = 300
const CART_MAX_RATIO = 0.55
const split = useTemplateRef<HTMLElement>('split')
const { width: splitWidth } = useElementSize(split)
const cartRaw = ref(readCartWidth())
const dragging = ref(false)
const cartMax = computed(() => (splitWidth.value > 0 ? Math.max(CART_MIN, Math.floor(splitWidth.value * CART_MAX_RATIO)) : Infinity))
const clampCart = (w: number) => Math.round(Math.min(cartMax.value, Math.max(CART_MIN, w)))
const cartWidth = computed(() => clampCart(cartRaw.value))
const splitStyle = computed(() => (isLarge.value ? { gridTemplateColumns: `minmax(0,1fr) 1rem ${cartWidth.value}px` } : undefined))

function readCartWidth() {
  try {
    const n = Number(localStorage.getItem(CART_KEY))
    return Number.isFinite(n) && n > 0 ? n : CART_DEFAULT
  } catch { return CART_DEFAULT }
}
function onDividerResize(delta: number) {
  // The cart sits at the inline end, so moving the divider toward the end (right in LTR) narrows it.
  const rtl = split.value ? getComputedStyle(split.value).direction === 'rtl' : false
  cartRaw.value += rtl ? delta : -delta
  // While dragging keep the unclamped value so the cart only moves again once the pointer is back in range.
  if (!dragging.value) cartRaw.value = clampCart(cartRaw.value)
}
function endDrag() {
  if (!dragging.value) return
  dragging.value = false
  cartRaw.value = cartWidth.value
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}
function startDrag() {
  dragging.value = true
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}
function resetCartWidth() { cartRaw.value = CART_DEFAULT }
useEventListener(window, 'pointerup', endDrag)
useEventListener(window, 'pointercancel', endDrag)
watchDebounced(cartWidth, (w) => {
  if (dragging.value) return
  try { w === CART_DEFAULT ? localStorage.removeItem(CART_KEY) : localStorage.setItem(CART_KEY, String(w)) } catch { /* storage unavailable */ }
}, { debounce: 200 })

// ---- checkout ------------------------------------------------------------------------------
const busy = ref(false)
const payError = ref('')
const lastSale = ref<SaleDto | null>(null)

function openPayment() {
  if (!cart.canCheckout || busy.value || anyDialog.value) return
  payError.value = ''
  payOpen.value = true
}

async function submitPayment(payment: PaymentInput) {
  if (busy.value) return
  // Same key on every retry of this unchanged cart; the store drops it when the cart changes.
  const parsed = checkoutSchema.safeParse({ idempotencyKey: cart.ensureKey(), items: cart.checkoutItems(), payment })
  if (!parsed.success) {
    payError.value = parsed.error.issues[0]?.message ?? 'Invalid sale'
    return
  }
  busy.value = true
  payError.value = ''
  try {
    const { data } = await api.post<SaleDto>('/sales', parsed.data)
    lastSale.value = data
    cart.clear() // success: next sale gets a fresh key
    payOpen.value = false
    receiptOpen.value = true
    toast.success(`Sale ${data.receiptNo} completed`)
    loadProducts()
  } catch (e) {
    await handleCheckoutError(e)
  } finally {
    busy.value = false
  }
}

async function handleCheckoutError(e: unknown) {
  const status = axios.isAxiosError(e) ? e.response?.status : undefined
  const msg = errorMessage(e, 'Checkout failed')
  if (status === 409) {
    // Insufficient stock (or archived product): refresh and show exactly what is short.
    const d = (axios.isAxiosError(e) ? e.response?.data?.error?.details : undefined) as
      | { productId?: string; available?: number; requested?: number } | undefined
    await refreshCartStock()
    const short = cart.stockIssues.map((l) => `${l.name} (${Math.max(l.stockQty, 0)} available, ${l.qty} in cart)`)
    const named = d?.productId ? cart.lines.find((l) => l.productId === d.productId)?.name : undefined
    const detail = short.length
      ? short.join('; ')
      : named ? `${named}${d?.available != null ? `: ${d.available} available` : ''}` : msg
    payOpen.value = false
    toast.show(`${msg}. ${detail}`, { variant: 'error', heading: 'Cannot complete sale', duration: 10000 })
    loadProducts()
  } else if (status === 400) {
    payError.value = msg
    await refreshCartStock() // price changes server-side are the usual cause of an amount mismatch
  } else {
    payError.value = msg // network/5xx: stay open; Pay retries with the same idempotency key
  }
}

// ---- held carts ----------------------------------------------------------------------------
const held = ref<HeldCartDto[]>([])
const heldLoading = ref(false)
const heldBusyId = ref<string | null>(null)

async function loadHeld() {
  heldLoading.value = true
  try {
    held.value = (await api.get<HeldCartDto[]>('/held-carts')).data
  } catch (e) {
    toast.error(errorMessage(e, 'Could not load held carts'))
  } finally {
    heldLoading.value = false
  }
}
function openHeld() {
  heldOpen.value = true
  loadHeld()
}

async function holdCart() {
  if (!cart.lines.length || busy.value || anyDialog.value) return
  const label = `Held ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  const parsed = heldCartInputSchema.safeParse({ label, items: cart.holdItems() })
  if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? 'Invalid cart')
  busy.value = true
  try {
    await api.post('/held-carts', parsed.data)
    cart.clear()
    toast.success('Cart held')
    loadHeld()
  } catch (e) {
    toast.error(errorMessage(e, 'Could not hold cart'))
  } finally {
    busy.value = false
  }
}

async function resumeCart(h: HeldCartDto) {
  if (cart.lines.length) {
    const ok = await confirm({
      heading: 'Replace current cart?',
      description: 'The current cart will be discarded. Hold it first if you want to keep it.',
      confirmLabel: 'Replace',
      destructive: true,
    })
    if (!ok) return
  }
  heldBusyId.value = h.id
  try {
    // Resume removes the hold server-side, so fetch fresh product data right after.
    const { data } = await api.post<HeldCartDto & { items: { productId: string; qty: number; discount?: never }[] }>(`/held-carts/${h.id}/resume`)
    const items = data.items as { productId: string; qty: number; discount?: import('@hydrosure/shared').DiscountInput }[]
    const res = await Promise.allSettled(items.map((i) => api.get<ProductDto>(`/products/${i.productId}`)))
    const next: Parameters<typeof cart.replace>[0] = []
    const dropped: string[] = []
    res.forEach((r, i) => {
      const it = items[i]!
      if (r.status === 'fulfilled' && !r.value.data.archivedAt) next.push({ product: r.value.data, qty: it.qty, discount: it.discount })
      else dropped.push(r.status === 'fulfilled' ? r.value.data.name : it.productId)
    })
    cart.replace(next)
    heldOpen.value = false
    mobileView.value = 'cart'
    if (dropped.length) toast.show(`Removed unavailable items: ${dropped.join(', ')}`, { variant: 'warning', heading: 'Cart resumed' })
    else toast.success('Cart resumed')
    loadHeld()
  } catch (e) {
    toast.error(errorMessage(e, 'Could not resume cart'))
    loadHeld()
  } finally {
    heldBusyId.value = null
  }
}

async function discardHeld(h: HeldCartDto) {
  const ok = await confirm({ heading: 'Discard held cart?', description: 'This cannot be undone.', confirmLabel: 'Discard', destructive: true })
  if (!ok) return
  heldBusyId.value = h.id
  try {
    await api.delete(`/held-carts/${h.id}`)
    held.value = held.value.filter((x) => x.id !== h.id)
  } catch (e) {
    toast.error(errorMessage(e, 'Could not discard held cart'))
    loadHeld()
  } finally {
    heldBusyId.value = null
  }
}

async function clearCart() {
  const ok = await confirm({ heading: 'Clear cart?', description: 'All items will be removed.', confirmLabel: 'Clear', destructive: true })
  if (ok) cart.clear()
}

// ---- shortcuts -----------------------------------------------------------------------------
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (anyDialog.value) { payOpen.value = false; heldOpen.value = false; receiptOpen.value = false }
    return
  }
  if (e.key === 'F2') { e.preventDefault(); mobileView.value = 'products'; searchEl.value?.focus() }
  else if (e.key === 'F4') { e.preventDefault(); openPayment() }
  else if (e.key === 'F8') { e.preventDefault(); holdCart() }
})

onMounted(async () => {
  loadProducts()
  loadHeld()
  api.get<{ id: string; name: string }[]>('/categories').then((r) => { categories.value = r.data }).catch(() => {})
  if (cart.lines.length) refreshCartStock()
})

function stockBadge(p: ProductDto) {
  if (p.stockQty <= 0) return { label: 'Out of stock', color: 'rose' }
  if (p.stockQty <= p.reorderLevel) return { label: `Low: ${p.stockQty}`, color: 'amber' }
  return { label: `${p.stockQty} in stock`, color: 'emerald' }
}
</script>

<template>
  <div class="flex h-[calc(100dvh-5rem)] min-h-0 flex-col gap-3">
    <div v-if="!isLarge" data-testid="mobile-tabs">
      <LTabs v-model:index="mobileTab" :tabs="mobileTabs" />
    </div>

    <div ref="split" class="grid min-h-0 flex-1 gap-3 lg:gap-0" :style="splitStyle">
      <!-- catalog -->
      <section v-show="isLarge || mobileView === 'products'" class="flex min-h-0 min-w-0 flex-col gap-3" aria-label="Products">
        <div class="flex items-end gap-2">
          <div class="min-w-0 flex-1" data-testid="search">
            <LSearchInput ref="searchEl" v-model="search" placeholder="Search name, SKU or barcode (F2)" />
          </div>
        </div>
        <p class="hidden text-xs text-fg-muted lg:block">
          Shortcuts: <kbd>F2</kbd> search - <kbd>F4</kbd> pay - <kbd>F8</kbd> hold - <kbd>Esc</kbd> close dialog. Barcode scanner is always listening.
        </p>

        <div role="group" aria-label="Categories" data-testid="categories">
          <LSegmented v-model="categoryId" :options="categoryOptions" />
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <div v-if="loading" class="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3" aria-busy="true">
            <LSkeleton v-for="n in 8" :key="n" variant="rectangular" height="9rem" />
          </div>
          <ErrorState v-else-if="loadError" heading="Could not load products" :message="loadError" @retry="loadProducts()" />
          <EmptyState v-else-if="!products.length" heading="No products found" description="Try a different search or category." icon="box" />
          <template v-else>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3" data-testid="product-grid">
              <LCard
                v-for="p in products"
                :key="p.id"
                padding="none"
                :hoverable="p.stockQty > 0 ? true : undefined"
                role="button"
                :tabindex="p.stockQty > 0 ? 0 : -1"
                :aria-disabled="p.stockQty <= 0"
                :aria-label="`${p.name}, ${formatMoney(p.price)}, ${stockBadge(p).label}`"
                :class="['block text-left outline-offset-2 focus-visible:outline focus-visible:outline-2', p.stockQty <= 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer']"
                data-testid="product-card"
                @click="addToCart(p)"
                @keydown.enter.self.prevent="addToCart(p)"
                @keydown.space.self.prevent="addToCart(p)"
              >
                <div class="flex h-20 items-center justify-center bg-surface-muted text-fg-muted">
                  <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.name" class="h-full w-full object-cover" />
                  <Package v-else :size="28" aria-hidden="true" />
                </div>
                <div class="flex flex-1 flex-col gap-1 p-2">
                  <p class="line-clamp-2 text-sm font-medium">{{ p.name }}</p>
                  <p class="text-xs text-fg-muted">{{ p.sku }}</p>
                  <div class="mt-auto flex flex-wrap items-center justify-between gap-1 pt-1">
                    <span class="text-sm font-semibold">{{ formatMoney(p.price) }}</span>
                    <LBadge :label="stockBadge(p).label" :color="stockBadge(p).color" size="sm" />
                  </div>
                </div>
              </LCard>
            </div>
            <div v-if="page < totalPages" class="flex justify-center py-3">
              <LButton variant="outline" @click="loadProducts(false)">Load more</LButton>
            </div>
          </template>
        </div>
      </section>

      <!-- drag (or arrow keys) to resize; double-click resets. Desktop two-pane layout only. -->
      <div v-if="isLarge" class="min-h-0" data-testid="pos-divider" title="Drag to resize, double-click to reset" @pointerdown="startDrag" @dblclick="resetCartWidth">
        <LDivider orientation="vertical" resizable handle-variant="bar" :step="10" @resize="onDividerResize" />
      </div>

      <!-- cart -->
      <div v-show="isLarge || mobileView === 'cart'" class="min-h-0">
        <CartPanel :busy="busy" :held-count="held.length" @pay="openPayment" @hold="holdCart" @clear="clearCart" @show-held="openHeld" />
      </div>
    </div>

    <PaymentDialog v-model:open="payOpen" :total-cents="cart.totals.total" :busy="busy" :error="payError" @submit="submitPayment" />
    <HeldCartsDialog v-model:open="heldOpen" :carts="held" :loading="heldLoading" :busy-id="heldBusyId" @resume="resumeCart" @discard="discardHeld" />
    <ReceiptDialog v-model:open="receiptOpen" :sale="lastSale" close-label="New sale" />
  </div>
</template>
