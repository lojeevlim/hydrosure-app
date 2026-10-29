import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthTokens, AuthUser, Role } from '@hydrosure/shared'
import { api, configureApiAuth, loadSession, refreshTokens, saveSession } from '../lib/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const ready = ref(false)
  const accessToken = ref<string | null>(loadSession()?.accessToken ?? null)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed<Role | null>(() => user.value?.role ?? null)
  const hasRole = (...roles: Role[]) => !!role.value && roles.includes(role.value)
  const isAdmin = computed(() => role.value === 'admin')
  const isManager = computed(() => role.value === 'manager' || role.value === 'admin')

  function setSession(t: AuthTokens) {
    saveSession({ accessToken: t.accessToken, refreshToken: t.refreshToken })
    accessToken.value = t.accessToken
    user.value = t.user
  }
  function clear() {
    saveSession(null)
    accessToken.value = null
    user.value = null
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<AuthTokens>('/auth/login', { email, password })
    setSession(data)
  }

  async function loginWithGoogle(idToken: string) {
    const { data } = await api.post<AuthTokens>('/auth/google', { idToken })
    setSession(data)
  }

  async function logout() {
    const s = loadSession()
    try {
      if (s?.refreshToken) await api.post('/auth/logout', { refreshToken: s.refreshToken })
    } catch {
      // best effort: the local session is cleared either way
    } finally {
      clear()
    }
  }

  async function refresh() {
    await refreshTokens() // persists the rotated tokens and updates the store through configureApiAuth
  }

  async function me() {
    const { data } = await api.get<AuthUser & { active: boolean }>('/auth/me')
    user.value = { id: data.id, email: data.email, name: data.name, role: data.role }
  }

  /** Restores the session on first load (called by the router guard). */
  async function init() {
    if (ready.value) return
    try {
      if (loadSession()) await me() // a 401 triggers refresh + retry in the axios interceptor
    } catch {
      clear()
    } finally {
      ready.value = true
    }
  }

  // Wire the axios client back to the store. The api 'expired' hook redirects via the router (set in router.ts).
  configureApiAuth({
    onTokens: (t) => { accessToken.value = t.accessToken; user.value = t.user },
    onSessionExpired: () => { clear(); window.dispatchEvent(new Event('hydrosure:session-expired')) },
  })

  return { user, ready, accessToken, isAuthenticated, role, hasRole, isAdmin, isManager, login, loginWithGoogle, logout, refresh, me, init, clear }
})
