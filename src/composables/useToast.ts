import { reactive } from 'vue'

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'
export interface ToastState {
  open: boolean
  variant: ToastVariant
  heading: string
  message: string
  duration: number
}

// Module-level singleton: <AppToast /> (one <l-toast>) renders this state.
const state = reactive<ToastState>({ open: false, variant: 'info', heading: '', message: '', duration: 4000 })

export function useToast() {
  function show(message: string, opts: Partial<Omit<ToastState, 'open' | 'message'>> = {}) {
    Object.assign(state, { duration: 4000, heading: '', variant: 'info' }, opts, { message, open: true })
  }
  const close = () => { state.open = false }
  return {
    state,
    show,
    close,
    success: (m: string, heading = 'Success') => show(m, { variant: 'success', heading }),
    error: (m: string, heading = 'Error') => show(m, { variant: 'error', heading }),
  }
}
