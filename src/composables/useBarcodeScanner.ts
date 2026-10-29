import { toValue, type MaybeRefOrGetter } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface BarcodeScannerOptions {
  /** Pause capture (e.g. while a dialog is open). */
  enabled?: MaybeRefOrGetter<boolean>
  minLength?: number
  /** Max gap between keystrokes of one scan. Scanners type in a few ms; humans are far slower. */
  maxGapMs?: number
}

/**
 * Keyboard-wedge barcode capture. Keystrokes are buffered while they arrive faster than
 * `maxGapMs`; an Enter that ends a long-enough fast burst is a scan. A slower keystroke resets
 * the buffer, so normal typing in a search box never triggers it (a human cannot Enter within
 * the gap after `minLength` characters). The scanner's characters still land in a focused input;
 * the caller clears it in `onScan`.
 */
export function useBarcodeScanner(onScan: (code: string) => void, opts: BarcodeScannerOptions = {}) {
  const minLength = opts.minLength ?? 3
  const maxGap = opts.maxGapMs ?? 60
  let buffer = ''
  let last = 0

  useEventListener(
    window,
    'keydown',
    (e: KeyboardEvent) => {
      if (opts.enabled !== undefined && !toValue(opts.enabled)) {
        buffer = ''
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const now = e.timeStamp
      if (e.key === 'Enter') {
        const code = buffer
        buffer = ''
        if (code.length >= minLength && now - last <= maxGap) {
          e.preventDefault()
          e.stopPropagation()
          onScan(code)
        }
        return
      }
      if (e.key.length !== 1) return // Shift, arrows, F-keys...
      if (buffer && now - last > maxGap) buffer = ''
      buffer += e.key
      last = now
    },
    { capture: true },
  )
}
