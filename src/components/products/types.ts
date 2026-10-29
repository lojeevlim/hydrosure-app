export interface Named { id: string; name: string }
export interface CategoryRow extends Named { parentId: string | null }
export interface UnitRow extends Named { abbreviation: string }
export interface SupplierRow extends Named {
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
}

export interface TaxCategoryRow extends Named { rate: string | number }

export interface ProductRow {
  id: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  categoryId: string | null
  brandId: string | null
  unitId: string | null
  supplierId: string | null
  taxCategoryId: string | null
  cost: string | number
  price: string | number
  wholesalePrice: string | number | null
  stockQty: number
  reorderLevel: number
  maxStock: number | null
  expirationDate: string | null
  imageUrl: string | null
  archivedAt: string | null
  createdAt: string
  category: Named | null
  brand: Named | null
  unit: UnitRow | null
  supplier: Named | null
  taxCategory: TaxCategoryRow | null
  tags: Named[]
}
