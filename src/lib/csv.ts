/** Neutralise spreadsheet formula injection: cells starting with = + - @ (or tab/CR) get a leading quote. */
function sanitize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = sanitize(String(value))
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

/** Downloads a CSV (UTF-8 with BOM so Excel reads non-ASCII correctly). */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const blob = new Blob(['﻿', toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
