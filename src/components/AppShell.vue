<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Role } from '@hydrosure/shared'
import type { LSidebarItem } from '../types/lojee-elements'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

function useLocalStorage<T>(key: string, initialValue: T) {
  const stored = ref<T>(initialValue)
  if (typeof window !== 'undefined') {
    try {
      const value = window.localStorage.getItem(key)
      if (value !== null) stored.value = JSON.parse(value)
    } catch { /* use the default when storage is unavailable */ }
  }
  watch(stored, (value) => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore storage failures */ }
  }, { immediate: true })
  return stored
}

import type { Ref } from 'vue'

function useElementSize(target: Ref<HTMLElement | null>, initialWidth = 0, initialHeight = 0) {
  const width = ref(initialWidth)
  const height = ref(initialHeight)
  let observer: ResizeObserver | undefined

  watch(target, (element, _, onCleanup) => {
    observer?.disconnect()
    if (!element) return
    const update = () => {
      const rect = element.getBoundingClientRect()
      width.value = rect.width
      height.value = rect.height
    }
    update()
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update)
      observer.observe(element)
    }
    onCleanup(() => observer?.disconnect())
  }, { immediate: true })
  onUnmounted(() => observer?.disconnect())
  return { width, height }
}

function useMutationObserver(
  target: Ref<HTMLElement | null>,
  callback: MutationCallback,
  options?: MutationObserverInit,
) {
  let observer: MutationObserver | undefined
  watch(target, (element, _, onCleanup) => {
    observer?.disconnect()
    if (!element) return
    observer = new MutationObserver(callback)
    observer.observe(element, options)
    onCleanup(() => observer?.disconnect())
  }, { immediate: true })
  onUnmounted(() => observer?.disconnect())
}

interface NavItem extends LSidebarItem { roles: Role[] }
const all: Role[] = ['admin', 'manager', 'cashier']
const staff: Role[] = ['admin', 'manager']
const nav: NavItem[] = [
  { label: 'Dashboard', icon: 'layout-dashboard', path: '/dashboard', roles: all },
  { label: 'POS', icon: 'shopping-cart', path: '/pos', roles: all },
  { label: 'Products', icon: 'box', path: '/products', roles: staff },
  { label: 'Categories & Brands', icon: 'tag', path: '/catalog', roles: staff },
  { label: 'Inventory', icon: 'building-2', path: '/inventory', roles: staff },
  { label: 'Suppliers', icon: 'contact-round', path: '/suppliers', roles: staff },
  { label: 'Sales history', icon: 'file', path: '/sales', roles: all },
]
const items = computed<LSidebarItem[]>(() =>
  nav.filter((n) => auth.hasRole(...n.roles)).map(({ label, icon, path }) => ({
    label,
    icon,
    path,
    // Keep the highlighted row in step with the router (also for programmatic navigation, e.g. the user menu).
    active: route.path === path || route.path.startsWith(`${path}/`),
  })),
)

// The sidebar keeps its last selection when no row is active (e.g. on /settings); remounting it clears the highlight.
const hasActiveItem = computed(() => items.value.some((i) => i.active))

const collapsed = useLocalStorage('hydrosure.sidebar.collapsed', false)

// <l-app> mirrors its drawer layout (container narrower than collapseBelow) as a `data-collapsed` attribute on itself.
const appRef = ref<HTMLElement | null>(null)
const isDrawer = ref(false)
// The drawer is an absolute panel over the whole app and the sticky navbar paints over its top edge, so inset it by the navbar height.
const navRef = ref<HTMLElement | null>(null)
const { height: navHeight } = useElementSize(navRef)
const sideStyle = computed(() => (isDrawer.value ? { boxSizing: 'border-box', paddingTop: `${navHeight.value}px` } : undefined))
const syncDrawer = () => { isDrawer.value = !!appRef.value?.hasAttribute('data-collapsed') }
useMutationObserver(appRef, syncDrawer, { attributes: true, attributeFilter: ['data-collapsed'] })
onMounted(syncDrawer)

// <l-app> toggles its drawer when a `lojee-side-toggle` event reaches the host (what <l-side-toggle> dispatches).
function closeDrawer() {
  const app = appRef.value
  if (app?.hasAttribute('data-side-open')) {
    app.dispatchEvent(new CustomEvent('lojee-side-toggle', { bubbles: true, composed: true }))
  }
}
watch(() => route.fullPath, closeDrawer)

// <l-sidebar> has no onNavigate; its default pushState + popstate would work, but we route through vue-router
// explicitly by intercepting the row link click in the capture phase (the sidebar skips defaultPrevented clicks).
// Sits on <l-side>, the host element that contains the sidebar.
function onSidebarClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = e.composedPath().find((n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement)
  const href = a?.getAttribute('href')
  if (!href || !href.startsWith('/')) return
  e.preventDefault()
  if (href !== route.fullPath) router.push(href)
  closeDrawer()
}

const userMenuItems = computed(() => [
  ...(auth.hasRole('admin', 'manager') ? [{ label: 'Settings', icon: 'settings' }] : []),
  { label: 'Log out', icon: 'log-out', danger: true },
])
const userEmail = computed(() => {
  const u = auth.user
  if (!u) return ''
  return u.role ? `${u.email} (${u.role})` : u.email
})

async function onUserMenuSelect(e: Event) {
  const d = (e as CustomEvent).detail
  const label = d?.label ?? d?.item?.label
  if (label === 'Settings') { router.push('/settings'); return }
  if (label !== 'Log out') return
  const ok = await confirm({ heading: 'Sign out?', description: 'You will need to sign in again.', confirmLabel: 'Sign out' })
  if (!ok) return
  await auth.logout()
  toast.success('Signed out')
  router.replace({ name: 'login' })
}
</script>

<template>
  <l-app
   :layout="[['side', 'top'], ['side', 'main'], ['side', 'footer']]"
    ref="appRef" collapse-below="3xl">
    <l-top>
      <l-navbar collapsible ref="navRef" sticky>
        <h1 class="truncate pl-2 text-sm font-semibold">{{ route.meta.title }}</h1>
        <div slot="actions" class="flex items-center gap-1">
           <l-theme-switcher
            align="start"
            :show-design="false"
            :show-active-items="false"
          ></l-theme-switcher>
          <l-user-menu
            :name="auth.user?.name ?? ''"
            :email="userEmail"
            :avatar-initials="(auth.user?.name ?? '?').charAt(0).toUpperCase()"
            :items="userMenuItems"
            @itemselect="onUserMenuSelect"
          />
        </div>
      </l-navbar>
    </l-top>
    <l-side :style="sideStyle" @click.capture="onSidebarClick">
      <l-sidebar
        :key="hasActiveItem ? 'nav' : 'none'"
        header="Hydrosure"
        :items="items"
        :collapsible="!isDrawer"
        :collapsed="!isDrawer && collapsed"
        @collapsedchange="(e: Event) => { if (!isDrawer) collapsed = !!(e as CustomEvent).detail }"
      />
    </l-side>
    <l-main padding="none" margin="none" rounded="none">
      <!-- PosPage sizes itself to calc(100dvh - 5rem); drop the bottom padding there so it fits without scrolling. -->
      <div :class="route.name === 'pos' ? 'px-4 pt-4' : 'p-4'"><RouterView /></div>
    </l-main>
  </l-app>
</template>
