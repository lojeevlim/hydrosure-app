// Minimal typings and loader for Google Identity Services (https://accounts.google.com/gsi/client).
export interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdApi {
  initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void
  renderButton(
    parent: HTMLElement,
    options: { type?: 'standard' | 'icon'; theme?: 'outline' | 'filled_blue' | 'filled_black'; size?: 'large' | 'medium' | 'small'; text?: string; shape?: string; width?: number; logo_alignment?: 'left' | 'center' },
  ): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let loading: Promise<void> | null = null

/** Loads the GIS script once. Rejects (and allows a retry) if it fails to load. */
export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (loading) return loading
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      loading = null
      reject(new Error('Failed to load Google Sign-In'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/** Initializes GIS and renders the official button into `el`. */
export async function renderGoogleButton(el: HTMLElement, clientId: string, onCredential: (idToken: string) => void) {
  await loadGoogleScript()
  const id = window.google?.accounts?.id
  if (!id) throw new Error('Google Sign-In unavailable')
  id.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) })
  id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: el.clientWidth || 320 })
}
