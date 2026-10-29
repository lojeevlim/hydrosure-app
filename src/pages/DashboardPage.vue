<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DashboardData } from '@hydrosure/shared'
import LButton from '../components/ui/LButton.vue'
import LSelect from '../components/ui/LSelect.vue'
import LStat from '../components/ui/LStat.vue'
import LChart from '../components/ui/LChart.vue'
import LDatePicker from '../components/ui/LDatePicker.vue'
import LBadge from '../components/ui/LBadge.vue'
import LAlert from '../components/ui/LAlert.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import Panel from '../components/dashboard/Panel.vue'
import { movementTypeLabels } from '../components/inventory/types'
import type { LActivityItem } from '../types/lojee-elements-extra'
import { api, errorMessage } from '../lib/api'
import { formatDateTime, formatMoney } from '../lib/format'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

const auth = useAuthStore()
const router = useRouter()
const isOwn = computed(() => data.value?.scope === 'own' || auth.role === 'cashier')

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'
const presetOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Custom range', value: 'custom' },
]
const preset = ref<Preset>('7d')
const custom = reactive({ from: '', to: '' })
const customError = ref('')

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const isoLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** 'YYYY-MM-DD' parsed as a local date. */
const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y!, m! - 1, d) }

function resolveRange(): { from: Date; to: Date } | null {
  const now = new Date()
  switch (preset.value) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': { const y = addDays(now, -1); return { from: startOfDay(y), to: endOfDay(y) } }
    case '7d': return { from: startOfDay(addDays(now, -6)), to: endOfDay(now) }
    case '30d': return { from: startOfDay(addDays(now, -29)), to: endOfDay(now) }
    default: {
      if (!custom.from || !custom.to) { customError.value = 'Choose both a start and an end date'; return null }
      const from = startOfDay(parseLocal(custom.from))
      const to = endOfDay(parseLocal(custom.to))
      if (from > to) { customError.value = 'Start date must not be after the end date'; return null }
      if (to.getTime() - from.getTime() > 366 * 86_400_000) { customError.value = 'Range cannot exceed 366 days'; return null }
      customError.value = ''
      return { from, to }
    }
  }
}

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const loadError = ref('')
let seq = 0

async function load() {
  const range = resolveRange()
  if (!range) return
  const mine = ++seq
  loading.value = true
  loadError.value = ''
  try {
    const { data: d } = await api.get<DashboardData>('/dashboard', {
      params: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
    })
    if (mine !== seq) return
    data.value = d
  } catch (e) {
    if (mine !== seq) return
    loadError.value = errorMessage(e, 'Could not load the dashboard')
  } finally {
    if (mine === seq) loading.value = false
  }
}

watch(preset, (p) => {
  if (p === 'custom') {
    if (!custom.from) {
      custom.to = isoLocalDate(new Date())
      custom.from = isoLocalDate(addDays(new Date(), -6))
    }
    customError.value = ''
    return // wait for Apply
  }
  load()
})
onMounted(load)

const hasSales = computed(() => (data.value?.current.transactionCount ?? 0) > 0)
const periodLabel = computed(() => presetOptions.find((o) => o.value === preset.value)?.label ?? '')
const methodLabel: Record<string, string> = { cash: 'Cash', card: 'Card', ewallet: 'E-wallet' }
const paymentTotal = computed(() => data.value?.paymentBreakdown.reduce((s, p) => s + p.amount, 0) ?? 0)

/** Hint under a stat that shows a delta: the old StatCard printed this next to the percentage. */
const deltaHint = (d: number | null | undefined) => (d === undefined ? undefined : d === null ? 'No prior data' : 'vs previous period')

const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
// Day-of-month axis labels: the chart truncates anything wider than ~4 characters; the caption carries the full range.
const axisDate = (d: string) => String(Number(d.split('-')[2]))
const trendData = computed(() => (data.value?.trend ?? []).map((p) => ({ label: axisDate(p.date), value: Math.max(0, p.total) })))
/** Three best sales days (zero-sales days excluded); ties go to the later date. */
const topDays = computed(() =>
  (data.value?.trend ?? [])
    .filter((p) => p.total > 0)
    .sort((x, y) => y.total - x.total || (x.date < y.date ? 1 : x.date > y.date ? -1 : 0))
    .slice(0, 3),
)
const isSingleDay = computed(() => preset.value === 'today' || preset.value === 'yesterday')
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`
const settings = useSettingsStore()
/** Single-day presets chart sales by hour between opening and closing time (today stops at the current hour). */
const hourlyData = computed(() => {
  const { openHour, closeHour } = settings
  const last = preset.value === 'today' ? Math.min(closeHour, Math.max(openHour, new Date().getHours())) : closeHour
  return (data.value?.hourly ?? [])
    .filter((h) => h.hour >= openHour && h.hour <= last)
    .map((h) => ({ label: hourLabel(h.hour), value: Math.max(0, h.total) }))
})
const initials = (name: string) => name.trim().charAt(0).toUpperCase() || '?'
/** Feed row: the activity entry plus the amount shown as a badge on the right. */
interface FeedRow { id: string; item: LActivityItem; badge: string; badgeColor?: string }
const transactionFeed = computed<FeedRow[]>(() =>
  (data.value?.recentTransactions ?? []).map((t) => ({
    id: t.id,
    badge: formatMoney(t.total),
    item: {
      actor: isOwn.value ? 'You' : t.cashierName,
      avatarInitials: initials(isOwn.value ? 'You' : t.cashierName),
      action: 'completed sale',
      target: `R-${String(t.number).padStart(6, '0')} (${t.methods.map((m) => methodLabel[m] ?? m).join(', ')})`,
      timestamp: formatDateTime(t.createdAt),
      icon: 'shopping-cart',
    },
  })),
)
const movementFeed = computed<FeedRow[]>(() =>
  (data.value?.recentMovements ?? []).map((m) => ({
    id: m.id,
    badge: `${m.qtyChange > 0 ? '+' : ''}${m.qtyChange}`,
    badgeColor: m.qtyChange > 0 ? 'emerald' : 'rose',
    item: {
      actor: m.productName,
      avatarInitials: initials(m.productName),
      action: movementTypeLabels[m.type],
      timestamp: formatDateTime(m.createdAt),
      icon: 'box',
      color: m.qtyChange > 0 ? 'emerald' : 'rose',
    },
  })),
)
const stockFeed = computed<FeedRow[]>(() =>
  (data.value?.inventory.lowStockItems ?? []).map((i) => {
    const out = i.stockQty <= 0
    return {
      id: i.id,
      badge: out ? 'Out' : `${i.stockQty} left`,
      badgeColor: out ? 'rose' : 'amber',
      item: {
        actor: i.name,
        avatarInitials: initials(i.name),
        action: out ? 'is out of stock' : 'is running low',
        timestamp: `${i.sku} - reorder level ${i.reorderLevel}`,
        icon: out ? 'circle-x' : 'triangle-alert',
        color: out ? 'rose' : 'amber',
      },
    }
  }),
)
const trendTotal = computed(() => (data.value?.trend ?? []).reduce((s, p) => s + p.total, 0))

// lojee-ui ColorName per method (the ring); the legend dots use the same colour's 600 shade (what the chart draws).
const methodColors: Record<string, string> = { cash: 'emerald', card: 'indigo', ewallet: 'amber' }
const methodDotHex: Record<string, string> = { emerald: '#059669', indigo: '#4f46e5', amber: '#d97706' }
const methodDot = (m: string) => methodDotHex[methodColors[m] ?? ''] ?? '#475569'
const paymentData = computed(() =>
  (data.value?.paymentBreakdown ?? []).map((p) => ({ label: methodLabel[p.method] ?? p.method, value: p.amount, color: methodColors[p.method] ?? 'slate' })),
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-fg">Dashboard</h2>
        <p class="text-sm text-fg-muted">
          {{ isOwn ? 'Your sales' : 'Store-wide sales' }} - {{ periodLabel }}
        </p>
      </div>
      <div class="flex w-full flex-wrap items-end gap-2 sm:w-auto">
        <div class="w-full sm:w-44"><LSelect v-model="preset" :options="presetOptions" /></div>
        <template v-if="preset === 'custom'">
          <LDatePicker v-model="custom.from" label="From" class="w-full sm:w-52" />
          <LDatePicker v-model="custom.to" label="To" class="w-full sm:w-52" />
          <LButton :loading="loading" @click="load">Apply</LButton>
        </template>
      </div>
    </div>
    <LAlert v-if="customError" variant="error" role="alert">{{ customError }}</LAlert>

    <ErrorState v-if="loadError" heading="Could not load the dashboard" :message="loadError" @retry="load" />

    <template v-else>
      <!-- One grid so all cards (with and without an icon / delta line) share one row height. -->
      <div :class="['grid auto-rows-fr grid-cols-2 gap-3', isOwn ? 'lg:grid-cols-3' : 'lg:grid-cols-4']">
        <LStat label="Total sales" :value="formatMoney(data?.current.totalSales)" :delta="data ? data.change.totalSalesPct : undefined" :hint="data ? deltaHint(data.change.totalSalesPct) : undefined" :loading="loading && !data" />
        <LStat label="Transactions" :value="String(data?.current.transactionCount ?? 0)" :delta="data ? data.change.transactionCountPct : undefined" :hint="data ? deltaHint(data.change.transactionCountPct) : undefined" :loading="loading && !data" />
        <template v-if="!isOwn">
          <LStat label="Gross profit" :value="formatMoney(data?.current.grossProfit)" :delta="data ? data.change.grossProfitPct : undefined" :hint="data ? deltaHint(data.change.grossProfitPct) : undefined" :loading="loading && !data" />
          <LStat
            label="Margin"
            :value="data?.current.marginPct != null ? `${data.current.marginPct.toFixed(1)}%` : '-'"
            :hint="data?.previous.marginPct != null ? `Previous: ${data.previous.marginPct.toFixed(1)}%` : 'Gross profit / net sales'"
            :loading="loading && !data"
          />
        </template>
        <LStat v-else label="Avg. sale" :value="formatMoney(hasSales && data ? data.current.totalSales / data.current.transactionCount : 0)" hint="Total / transactions" :loading="loading && !data" />

        <LStat label="Active SKUs" :value="String(data?.inventory.activeSkus ?? 0)" :hint="data ? `${data.inventory.totalProducts} products incl. archived` : undefined" :loading="loading && !data" />
        <LStat label="Low stock" :value="String(data?.inventory.lowStockCount ?? 0)" tone="warn" icon="triangle-alert" hint="At or below reorder level" :loading="loading && !data" />
        <LStat label="Out of stock" :value="String(data?.inventory.outOfStockCount ?? 0)" tone="danger" icon="circle-x" hint="On hand is 0" :loading="loading && !data" />
        <LStat v-if="!isOwn" label="Inventory valuation" :value="formatMoney(data?.inventory.valuation)" hint="On hand x unit cost" :loading="loading && !data" />
      </div>

      <Panel title="Sales trend" :loading="loading && !data" :empty="!!data && !hasSales" empty-text="No sales in this period.">
       
        <template v-if="data">
          <LChart v-if="isSingleDay" type="bar" :data="hourlyData" :height="220" :count-up="true" />
          <div v-else class="mx-auto w-full" :style="{ maxWidth: trendData.length < 4 ? `${trendData.length * 6}rem` : undefined }">
            <LChart type="bar" :data="trendData" :height="220" :max-labels="10" :count-up="true" />
          </div>
          <div v-if="!isSingleDay" class="mt-3 border-t border-border pt-3">
            <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-fg-muted">Top {{ topDays.length === 1 ? 'day' : `${topDays.length} days` }}</h4>
              <p class="text-xs text-fg-muted">Total for period: <span class="font-medium text-fg">{{ formatMoney(trendTotal) }}</span></p>
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <LStat v-for="(d, i) in topDays" :key="d.date" :label="`#${i + 1} - ${shortDate(d.date)}`" :value="formatMoney(d.total)" :hint="`${d.count} sale${d.count === 1 ? '' : 's'}`" />
            </div>
          </div>
        </template>
      </Panel>

      <div class="grid gap-4 lg:grid-cols-2">
        <Panel title="Top products" :loading="loading && !data" :empty="!!data && !data.topProducts.length" empty-text="No products sold in this period.">
          <div v-if="data" class="grid gap-4 sm:grid-cols-2">
            <LStat v-for="p in data.topProducts" :key="p.productId" :label="p.name" :value="`${p.qty} sold`" :hint="formatMoney(p.revenue)" />
          </div>
        </Panel>

        <Panel title="Payment methods" :loading="loading && !data" :empty="!!data && !data.paymentBreakdown.length" empty-text="No payments in this period.">
          <template v-if="data">
            <!-- Ring only: its built-in centre total is an unformatted number; the list below carries the amounts. -->
            <LChart type="donut" :data="paymentData" :height="180" :show-labels="false" />
            <ul class="mt-3 space-y-2">
              <li v-for="p in data.paymentBreakdown" :key="p.method" class="flex items-baseline justify-between gap-2 text-sm">
                <span class="flex items-center gap-2 text-fg">
                  <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: methodDot(p.method) }" />{{ methodLabel[p.method] ?? p.method }}
                </span>
                <span class="text-fg-muted">{{ p.count }} - {{ formatMoney(p.amount) }} ({{ paymentTotal ? Math.round((p.amount / paymentTotal) * 100) : 0 }}%)</span>
              </li>
            </ul>
          </template>
        </Panel>

        <Panel title="Recent transactions" :loading="loading && !data" :empty="!!data && !data.recentTransactions.length" empty-text="No transactions in this period.">
          <div v-if="data" class="divide-y divide-border">
            <div v-for="r in transactionFeed" :key="r.id" class="flex items-center justify-between gap-2 py-2">
              <l-activity-feed class="min-w-0 flex-1" :items="[r.item]" />
              <LBadge :label="r.badge" :color="r.badgeColor" size="sm" />
            </div>
          </div>
        </Panel>

        <Panel v-if="!isOwn" title="Recent inventory movements" :loading="loading && !data" :empty="!!data && !data.recentMovements.length" empty-text="No stock movements in this period.">
          <div v-if="data" class="divide-y divide-border">
            <div v-for="r in movementFeed" :key="r.id" class="flex items-center justify-between gap-2 py-2">
              <l-activity-feed class="min-w-0 flex-1" :items="[r.item]" />
              <LBadge :label="r.badge" :color="r.badgeColor" size="sm" />
            </div>
          </div>
        </Panel>

        <Panel title="Low and out-of-stock" :loading="loading && !data" :empty="!!data && !data.inventory.lowStockItems.length" empty-text="All products are above their reorder level.">
          <template v-if="!isOwn" #action>
            <LButton variant="link" size="sm" @click="router.push('/inventory?status=low')">View in Inventory</LButton>
          </template>
          <div v-if="data" class="divide-y divide-border">
            <div v-for="r in stockFeed" :key="r.id" class="flex items-center justify-between gap-2 py-2">
              <l-activity-feed class="min-w-0 flex-1" :items="[r.item]" />
              <LBadge :label="r.badge" :color="r.badgeColor" size="sm" />
            </div>
          </div>
        </Panel>
      </div>
    </template>
  </div>
</template>
