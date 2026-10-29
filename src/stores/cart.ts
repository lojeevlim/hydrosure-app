import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { CartItemInput, DiscountInput } from '@hydrosure/shared'
import { useAuthStore } from './auth'

/** The subset of the API product the cart needs. Money fields arrive as strings (Prisma Decimal). */
export interface CartProduct {
  id: string
  sku: string
  barcode?: string | null
  name: string
  price: string | number
  stockQty: number
  archivedAt?: string | null
  taxCategory?: { rate: string | number } | null
}

export interface CartLine {
  productId: string
  sku: string
  name: string
  /** unit price in integer cents */
  price: number
  /** tax percent (tax-exclusive pricing) */
  taxRate: number
  stockQty: number
  qty: number
  discount?: DiscountInput
}

export interface LineTotals {
  gross: number
  itemDiscount: number
  txDiscount: number
  net: number
  tax: number
  total: number
}
export interface CartTotals {
  lines: LineTotals[]
  subtotal: number
  itemDiscount: number
  txDiscount: number
  discountTotal: number
  tax: number
  total: number
}

const toCents = (v: string | number) => Math.round(Number(v) * 100)

/** Same rules as apps/api salesService.discountCents, but clamped instead of throwing. */
function discountCents(base: number, d?: DiscountInput): number {
  if (!d) return 0
  const amt = d.type === 'percent' ? Math.round((base * d.value) / 100) : Math.round(d.value * 100)
  return Math.min(Math.max(amt, 0), base)
}

/**
 * Mirrors salesService.checkout in integer cents. The API has no cart-level discount, so a
 * transaction-level discount is allocated across lines (proportional to net, largest remainder)
 * and sent as extra per-line fixed discounts; tax is then computed per line on the final net.
 * Server totals stay authoritative; this is only the live preview.
 */
export function computeTotals(lines: CartLine[], txDiscount?: DiscountInput): CartTotals {
  const gross = lines.map((l) => l.price * l.qty)
  const itemDisc = lines.map((l, i) => discountCents(gross[i]!, l.discount))
  const nets = gross.map((g, i) => g - itemDisc[i]!)
  const netSum = nets.reduce((a, b) => a + b, 0)
  const pool = discountCents(netSum, txDiscount)

  const alloc = nets.map(() => 0)
  if (pool > 0 && netSum > 0) {
    const rem: { i: number; r: number }[] = []
    let given = 0
    nets.forEach((n, i) => {
      const exact = (pool * n) / netSum
      alloc[i] = Math.floor(exact)
      given += alloc[i]!
      rem.push({ i, r: exact - alloc[i]! })
    })
    rem.sort((a, b) => b.r - a.r || a.i - b.i)
    for (let k = 0; k < pool - given; k++) alloc[rem[k]!.i]!++
  }

  const out: LineTotals[] = lines.map((l, i) => {
    const net = nets[i]! - alloc[i]!
    const tax = Math.round((net * l.taxRate) / 100)
    return { gross: gross[i]!, itemDiscount: itemDisc[i]!, txDiscount: alloc[i]!, net, tax, total: net + tax }
  })
  const sum = (f: (t: LineTotals) => number) => out.reduce((a, t) => a + f(t), 0)
  const subtotal = sum((t) => t.gross)
  const itemDiscount = sum((t) => t.itemDiscount)
  const tx = sum((t) => t.txDiscount)
  const tax = sum((t) => t.tax)
  return {
    lines: out,
    subtotal,
    itemDiscount,
    txDiscount: tx,
    discountTotal: itemDiscount + tx,
    tax,
    total: subtotal - itemDiscount - tx + tax,
  }
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

const storageKey = (uid: string) => `hydrosure.cart.${uid}`

function cleanDiscount(d: DiscountInput | undefined): DiscountInput | undefined {
  if (!d || !Number.isFinite(d.value) || d.value <= 0) return undefined
  return d.type === 'percent'
    ? { type: 'percent', value: Math.min(100, d.value) }
    : { type: 'fixed', value: Math.round(d.value * 100) / 100 }
}

export const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()
  const lines = ref<CartLine[]>([])
  const txDiscount = ref<DiscountInput | undefined>(undefined)
  /** One key per checkout attempt: kept across retries, dropped when the cart changes or a sale succeeds. */
  const idempotencyKey = ref<string | null>(null)
  let loadedFor: string | null = null

  function load(uid: string | null | undefined) {
    loadedFor = uid ?? null
    lines.value = []
    txDiscount.value = undefined
    idempotencyKey.value = null
    if (!uid) return
    try {
      const raw = localStorage.getItem(storageKey(uid))
      if (!raw) return
      const p = JSON.parse(raw) as { lines?: CartLine[]; txDiscount?: DiscountInput; idempotencyKey?: string | null }
      lines.value = (p.lines ?? []).filter(
        (l) => l && typeof l.productId === 'string' && Number.isInteger(l.qty) && l.qty > 0 && Number.isFinite(l.price),
      )
      txDiscount.value = cleanDiscount(p.txDiscount)
      idempotencyKey.value = typeof p.idempotencyKey === 'string' ? p.idempotencyKey : null
    } catch {
      /* corrupt cart: start empty */
    }
  }
  // Keyed per user so a different login never inherits someone else's cart.
  watch(() => auth.user?.id, load, { immediate: true })
  watch(
    [lines, txDiscount, idempotencyKey],
    () => {
      if (!loadedFor) return
      localStorage.setItem(
        storageKey(loadedFor),
        JSON.stringify({ lines: lines.value, txDiscount: txDiscount.value, idempotencyKey: idempotencyKey.value }),
      )
    },
    { deep: true },
  )

  const totals = computed(() => computeTotals(lines.value, txDiscount.value))
  const count = computed(() => lines.value.reduce((a, l) => a + l.qty, 0))
  const stockIssues = computed(() => lines.value.filter((l) => l.qty > l.stockQty))
  const canCheckout = computed(() => lines.value.length > 0 && stockIssues.value.length === 0 && totals.value.total >= 0)

  // Any change to what is being sold invalidates the key (a retry of an unchanged cart reuses it).
  const touch = () => { idempotencyKey.value = null }

  function lineFrom(p: CartProduct, qty: number, discount?: DiscountInput): CartLine {
    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      price: toCents(p.price),
      taxRate: Number(p.taxCategory?.rate ?? 0),
      stockQty: p.stockQty,
      qty,
      discount,
    }
  }

  function add(p: CartProduct, qty = 1) {
    touch()
    const ex = lines.value.find((l) => l.productId === p.id)
    if (ex) {
      ex.qty += qty
      ex.stockQty = p.stockQty
    } else lines.value.push(lineFrom(p, qty))
  }
  function setQty(productId: string, qty: number) {
    const l = lines.value.find((x) => x.productId === productId)
    if (!l) return
    touch()
    l.qty = Math.min(999999, Math.max(1, Math.floor(Number.isFinite(qty) ? qty : 1)))
  }
  function remove(productId: string) {
    touch()
    lines.value = lines.value.filter((l) => l.productId !== productId)
  }
  function setItemDiscount(productId: string, d?: DiscountInput) {
    const l = lines.value.find((x) => x.productId === productId)
    if (!l) return
    touch()
    l.discount = cleanDiscount(d)
  }
  function setTxDiscount(d?: DiscountInput) {
    touch()
    txDiscount.value = cleanDiscount(d)
  }
  function clear() {
    lines.value = []
    txDiscount.value = undefined
    idempotencyKey.value = null
  }
  /** Replaces the cart (resume of a held cart). */
  function replace(next: { product: CartProduct; qty: number; discount?: DiscountInput }[]) {
    lines.value = next.map((n) => lineFrom(n.product, n.qty, cleanDiscount(n.discount)))
    txDiscount.value = undefined
    idempotencyKey.value = null
  }
  /** Refreshes stock/price/tax from fresh catalog data without invalidating the idempotency key. */
  function syncProducts(products: CartProduct[]) {
    const by = new Map(products.map((p) => [p.id, p]))
    for (const l of lines.value) {
      const p = by.get(l.productId)
      if (!p) continue
      l.stockQty = p.stockQty
      l.price = toCents(p.price)
      l.taxRate = Number(p.taxCategory?.rate ?? 0)
      l.name = p.name
    }
  }
  function ensureKey(): string {
    if (!idempotencyKey.value) idempotencyKey.value = newIdempotencyKey()
    return idempotencyKey.value
  }

  /**
   * Checkout items: discounts (item + allocated cart-level) are sent as exact fixed amounts so the
   * server derives the same cents as the preview.
   */
  function checkoutItems(): CartItemInput[] {
    return lines.value.map((l, i) => {
      const t = totals.value.lines[i]!
      const d = t.itemDiscount + t.txDiscount
      return { productId: l.productId, qty: l.qty, ...(d > 0 ? { discount: { type: 'fixed' as const, value: d / 100 } } : {}) }
    })
  }
  /** Hold items: item discounts keep their original form unless a cart-level discount must be baked in. */
  function holdItems(): CartItemInput[] {
    if (txDiscount.value) return checkoutItems()
    return lines.value.map((l) => ({ productId: l.productId, qty: l.qty, ...(l.discount ? { discount: l.discount } : {}) }))
  }

  return {
    lines, txDiscount, idempotencyKey, totals, count, stockIssues, canCheckout,
    add, setQty, remove, setItemDiscount, setTxDiscount, clear, replace, syncProducts, ensureKey,
    checkoutItems, holdItems,
  }
})
