import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from '@hydrosure/shared'
import { useAuthStore } from './stores/auth'
import { useToast } from './composables/useToast'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    roles?: Role[]
    title?: string
  }
}

const all: Role[] = ['admin', 'manager', 'cashier']

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./pages/LoginPage.vue'), meta: { public: true, title: 'Sign in' } },
    {
      path: '/',
      component: () => import('./components/AppShell.vue'),
      children: [
        { path: '', redirect: { name: 'dashboard' } },
        { path: 'dashboard', name: 'dashboard', component: () => import('./pages/DashboardPage.vue'), meta: { roles: all, title: 'Dashboard' } },
        { path: 'pos', name: 'pos', component: () => import('./pages/PosPage.vue'), meta: { roles: all, title: 'POS' } },
        { path: 'products', name: 'products', component: () => import('./pages/ProductsPage.vue'), meta: { roles: ['admin', 'manager'], title: 'Products' } },
        { path: 'catalog', name: 'catalog', component: () => import('./pages/CatalogPage.vue'), meta: { roles: ['admin', 'manager'], title: 'Categories & Brands' } },
        { path: 'inventory', name: 'inventory', component: () => import('./pages/InventoryPage.vue'), meta: { roles: ['admin', 'manager'], title: 'Inventory' } },
        { path: 'suppliers', name: 'suppliers', component: () => import('./pages/SuppliersPage.vue'), meta: { roles: ['admin', 'manager'], title: 'Suppliers' } },
        { path: 'settings', name: 'settings', component: () => import('./pages/SettingsPage.vue'), meta: { roles: ['admin', 'manager'], title: 'Settings' } },
        { path: 'sales', name: 'sales', component: () => import('./pages/SalesPage.vue'), meta: { roles: all, title: 'Sales history' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.public) {
    return auth.isAuthenticated && to.name === 'login' ? { path: '/' } : true
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined }
  }
  const roles = to.meta.roles
  if (roles && !auth.hasRole(...roles)) {
    useToast().error('You do not have access to that page', 'Forbidden')
    return { path: '/pos' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - Hydrosure` : 'Hydrosure'
})

// Refresh failed mid-session: bounce to login, remembering where the user was.
window.addEventListener('hydrosure:session-expired', () => {
  const current = router.currentRoute.value
  if (current.name !== 'login') {
    useToast().error('Your session has expired. Please sign in again.', 'Signed out')
    router.replace({ name: 'login', query: { redirect: current.fullPath } })
  }
})
