import type { PaymentMethod } from '@hydrosure/shared'

// Prisma Decimals are serialised as strings by the API.
type Dec = string | number

export interface SaleItemDto {
  id: string
  productId: string
  sku: string
  name: string
  qty: number
  unitPrice: Dec
  taxRate: Dec
  discountAmount: Dec
  lineSubtotal: Dec
  taxAmount: Dec
  lineTotal: Dec
}

export interface PaymentDto {
  id: string
  method: PaymentMethod
  status: 'captured' | 'unverified' | 'voided' | string
  verified: boolean
  amount: Dec
  tendered: Dec
  changeGiven: Dec
  externalRef: string | null
}

export interface SaleDto {
  id: string
  number: number
  receiptNo: string
  status: 'completed' | 'voided'
  createdAt: string
  subtotal: Dec
  discountTotal: Dec
  taxTotal: Dec
  total: Dec
  voidedAt?: string | null
  voidReason?: string | null
  customer?: { id: string; name: string } | null
  cashier?: { id: string; name: string } | null
  voidedBy?: { id: string; name: string } | null
  items?: SaleItemDto[]
  payments: PaymentDto[]
}

export interface ReceiptDto extends SaleDto {
  store?: { name: string; currency: string }
}
