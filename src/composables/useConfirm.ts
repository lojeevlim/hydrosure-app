import { reactive } from 'vue'

export interface ConfirmOptions {
  heading?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ConfirmState extends Required<ConfirmOptions> {
  open: boolean
}

// Module-level singleton: render <ConfirmDialog /> once (App.vue); call useConfirm()() anywhere.
const state = reactive<ConfirmState>({
  open: false,
  heading: 'Are you sure?',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  destructive: false,
})
let resolver: ((v: boolean) => void) | null = null

function settle(v: boolean) {
  state.open = false
  const r = resolver
  resolver = null
  r?.(v)
}

export function useConfirmState() {
  return { state, settle }
}

export function useConfirm() {
  return (opts: ConfirmOptions = {}): Promise<boolean> => {
    resolver?.(false) // a newer prompt supersedes an unanswered one
    Object.assign(state, {
      heading: 'Are you sure?',
      description: '',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      destructive: false,
    }, opts, { open: true })
    return new Promise<boolean>((resolve) => { resolver = resolve })
  }
}
