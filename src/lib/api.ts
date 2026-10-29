import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { AuthTokens } from '@hydrosure/shared'

// API mounts everything under /api (apps/api/src/app.ts), default port 4000.
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export const api = axios.create({ baseURL })

const KEY = 'hydrosure.auth'
export interface StoredSession {
  accessToken: string
  refreshToken: string
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}
export function saveSession(s: StoredSession | null) {
  if (s) localStorage.setItem(KEY, JSON.stringify(s))
  else localStorage.removeItem(KEY)
}

// The auth store registers these so the client stays free of store imports (no cycles).
let onSessionExpired: () => void = () => {}
let onTokens: (t: AuthTokens) => void = () => {}
export function configureApiAuth(h: { onSessionExpired: () => void; onTokens: (t: AuthTokens) => void }) {
  onSessionExpired = h.onSessionExpired
  onTokens = h.onTokens
}

api.interceptors.request.use((config) => {
  const s = loadSession()
  if (s?.accessToken) config.headers.set('Authorization', `Bearer ${s.accessToken}`)
  return config
})

// Single-flight: concurrent 401s share one refresh request.
let refreshing: Promise<string> | null = null

export function refreshTokens(): Promise<string> {
  if (!refreshing) {
    const s = loadSession()
    if (!s?.refreshToken) return Promise.reject(new Error('No refresh token'))
    // Bare axios: bypass interceptors so a failing refresh cannot recurse.
    refreshing = axios
      .post<AuthTokens>(`${baseURL}/auth/refresh`, { refreshToken: s.refreshToken })
      .then(({ data }) => {
        saveSession({ accessToken: data.accessToken, refreshToken: data.refreshToken })
        onTokens(data)
        return data.accessToken
      })
      .finally(() => { refreshing = null })
  }
  return refreshing
}

type Retryable = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as Retryable | undefined
    const url = original?.url ?? ''
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/google') || url.includes('/auth/refresh') || url.includes('/auth/logout')
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true
      try {
        const token = await refreshTokens()
        original.headers.set('Authorization', `Bearer ${token}`)
        return api(original as AxiosRequestConfig)
      } catch {
        saveSession(null)
        onSessionExpired()
      }
    }
    return Promise.reject(error)
  },
)

/** Extracts the API's `{ error: { message } }` shape, falling back to a generic message. */
export function errorMessage(e: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: { message?: string } } | undefined
    if (data?.error?.message) return data.error.message
    if (!e.response) return 'Cannot reach the server'
  }
  return e instanceof Error && e.message ? e.message : fallback
}
