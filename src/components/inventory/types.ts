import type { MovementType } from '@hydrosure/shared'

export interface StockProduct {
  id: string
  sku: string
  name: string
  cost: number | string
  stockQty: number
  reorderLevel: number
  maxStock?: number | null
}

export interface MovementRow {
  id: string
  type: MovementType
  qtyChange: number
  qtyBefore: number
  qtyAfter: number
  reason: string | null
  createdAt: string
  product: { id: string; sku: string; name: string }
  user: { id: string; name: string } | null
}

export type StockAction = 'receive' | 'adjust' | 'waste' | 'opening'

export const movementTypeLabels: Record<MovementType, string> = {
  opening_balance: 'Opening balance',
  receipt: 'Receipt',
  adjustment: 'Adjustment',
  damage: 'Damage',
  waste: 'Waste',
  sale: 'Sale',
  void_return: 'Void return',
}

/** Suggested reorder quantity: top up to max stock when set, otherwise to twice the reorder level. */
export function reorderSuggestion(p: Pick<StockProduct, 'stockQty' | 'reorderLevel' | 'maxStock'>): number {
  if (p.maxStock != null) return Math.max(0, p.maxStock - p.stockQty)
  return Math.max(0, p.reorderLevel * 2 - p.stockQty)
}

export function stockStatus(p: Pick<StockProduct, 'stockQty' | 'reorderLevel'>): { label: string; color: string } {
  if (p.stockQty <= 0) return { label: 'Out of stock', color: 'rose' }
  if (p.stockQty <= p.reorderLevel) return { label: 'Low stock', color: 'amber' }
  return { label: 'In stock', color: 'emerald' }
}
