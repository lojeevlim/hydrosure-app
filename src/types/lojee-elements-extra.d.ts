// Additional lojee-ui Web Component typings (same conventions as lojee-elements.d.ts, which is kept untouched).
// Verified against lojee_ui/src/elements/register.tsx. Events are CustomEvents: `@change` maps to `onChange`.
import type { FunctionalComponent } from 'vue'

type Ev<T> = (e: CustomEvent<T>) => void
type Common = { class?: unknown; style?: unknown; slot?: string; id?: string }
type El<P> = FunctionalComponent<P & Common>

export interface LChartPoint {
  label: string
  value: number
  color?: string
}
export interface LActivityItem {
  actor: string
  avatarInitials?: string
  action: string
  target?: string
  timestamp: string
  icon?: string
  color?: string
}
export interface LTabItem {
  label: string
  content: string
  disabled?: boolean
}
export interface LComboboxOption {
  label: string
  value: string
}
declare module 'vue' {
  interface GlobalComponents {
    'l-stat': El<{
      label?: string; value?: string; change?: string; trend?: 'up' | 'down' | 'neutral'
      icon?: string; color?: string; countUp?: boolean; countUpDuration?: number
    }>
    'l-activity-feed': El<{ items?: LActivityItem[]; compact?: boolean }>
    'l-chart': El<{
      type?: 'bar' | 'line' | 'donut'; data?: LChartPoint[]; variant?: 'default' | 'values'
      height?: number; color?: string; showLabels?: boolean; countUp?: boolean; countUpDuration?: number
    }>
    'l-tabs': El<{
      tabs?: LTabItem[]; index?: number; defaultIndex?: number; color?: string
      onChange?: Ev<number>; onUpdate?: Ev<number>
    }>
    'l-button-group': El<{
      selectable?: boolean; defaultActive?: number
      onItemclick?: Ev<{ index: number; label: string }>
    }>
    'l-segment-button': El<{ icon?: string; active?: boolean; disabled?: boolean }>
    'l-date-picker': El<{
      value?: string; size?: string; variant?: string; invalid?: boolean; disabled?: boolean
      required?: boolean; name?: string
      onInput?: Ev<string>; onUpdate?: Ev<string>; onClear?: Ev<unknown>
    }>
    'l-combobox': El<{
      options?: LComboboxOption[]; value?: string; placeholder?: string
      onChange?: Ev<string>; onInput?: Ev<string>; onUpdate?: Ev<string>
    }>
    'l-divider': El<{
      orientation?: 'horizontal' | 'vertical'; label?: string; color?: string; resizable?: boolean
      handleVariant?: 'grip' | 'dots' | 'arrows' | 'circle' | 'bar' | 'pill'; step?: number
      onResize?: Ev<number>
    }>
    'l-alert': El<{
      variant?: 'info' | 'success' | 'warning' | 'error'; heading?: string; icon?: string; closable?: boolean
      onClose?: Ev<unknown>
    }>
    'l-progress-bar': El<{
      value?: number; max?: number; size?: string; color?: string; showLabel?: boolean
      striped?: boolean; indeterminate?: boolean
    }>
  }
}
export {}
