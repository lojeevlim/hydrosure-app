const currency: string = (import.meta.env.VITE_CURRENCY as string | undefined) || 'PHP'

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency })

export function formatMoney(n: number | string | null | undefined): string {
  const v = Number(n ?? 0)
  return money.format(Number.isFinite(v) ? v : 0)
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Converts a local YYYY-MM-DD date into the ISO instant of its local start (or end) of day, so API range filters match the dates the UI displays. */
export function localDayIso(ymd: string, edge: 'start' | 'end'): string | undefined {
  if (!ymd) return undefined
  const d = new Date(edge === 'start' ? `${ymd}T00:00:00` : `${ymd}T23:59:59.999`)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}
