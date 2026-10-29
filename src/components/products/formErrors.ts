import axios from 'axios'
import type { ZodError } from 'zod'

/** Zod's default messages are developer-oriented; map the common ones to something a cashier-facing form can show. */
export function friendlyIssue(issue: { message: string; code?: string }, label = 'This field'): string {
  const m = issue.message
  if (/>=1 char|at least 1/i.test(m) || /expected (string|number), received (undefined|nan)/i.test(m) || /invalid input: expected/i.test(m)) return `${label} is required`
  if (/<=\d+ char|at most/i.test(m)) return `${label} is too long`
  if (/valid email|invalid email/i.test(m)) return 'Enter a valid email address'
  if (/multiple of/i.test(m)) return 'Use at most 2 decimal places'
  if (/>=0|nonnegative|greater than or equal/i.test(m)) return 'Must be 0 or more'
  if (/int/i.test(m)) return 'Must be a whole number'
  return m
}

/** First error per top-level field path. */
export function fieldErrors(err: ZodError, labels: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? '')
    out[k] ??= friendlyIssue(issue, labels[k])
  }
  return out
}

/** Maps an API 409 DUPLICATE / 400 VALIDATION_ERROR response to per-field messages (empty when not field-specific). */
export function apiFieldErrors(e: unknown, labels: Record<string, string> = {}): Record<string, string> {
  if (!axios.isAxiosError(e)) return {}
  const err = (e.response?.data as { error?: { code?: string; details?: unknown } } | undefined)?.error
  const out: Record<string, string> = {}
  if (e.response?.status === 409 && err?.code === 'DUPLICATE') {
    // The API sends details.fields (Prisma unique-constraint target); older shape was details.target.
    const d = err.details as { fields?: string[] | string; target?: string[] | string } | undefined
    const raw = d?.fields ?? d?.target
    for (const t of Array.isArray(raw) ? raw : raw ? [raw] : []) {
      // Tolerate index names such as "Product_sku_key"; the generic 'field' placeholder is not field-specific.
      const k = /^[A-Za-z]+_(\w+)_key$/.exec(String(t))?.[1] ?? String(t)
      if (k === 'field') continue
      out[k] = `${labels[k] ?? k} already exists`
    }
  } else if (e.response?.status === 400 && Array.isArray(err?.details)) {
    for (const d of err.details as { path: string; message: string }[]) {
      out[d.path.split('.')[0]] ??= d.message
    }
  }
  return out
}
