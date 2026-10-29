// Typings for the lojee-ui Web Components (<l-*>) used from Vue templates.
// Props are set as DOM properties; events are CustomEvents named after the React callback (minus "on", lowercase),
// so `@sortchange` maps to `onSortchange` here. Verified against lojee_ui/src/elements/register.tsx.
import type { FunctionalComponent } from 'vue'

type Ev<T> = (e: CustomEvent<T>) => void
type Common = { class?: unknown; style?: unknown; slot?: string; id?: string }
type El<P> = FunctionalComponent<P & Common>

export interface LTableColumn {
  key: string
  header: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
  type?:
    | 'text' | 'user' | 'badges' | 'progress' | 'payment' | 'status' | 'rating'
    | 'image' | 'link' | 'avatars' | 'currency' | 'date'
}
export interface LTableAction {
  label: string
  value?: string
  icon?: string
  color?: string
}
export interface LSelectOption {
  label: string
  value: string
  disabled?: boolean
}
export interface LSidebarItem {
  label: string
  icon?: string
  path: string
  /** Highlights the row; recompute it from the router so the sidebar follows route changes. */
  active?: boolean
}
export interface LUserMenuItem {
  label: string
  icon?: string
  danger?: boolean
}
export type LFormEvents<T = string> = {
  onInput?: Ev<T>
  onUpdate?: Ev<T>
  onFocus?: Ev<T>
  onInvalid?: Ev<string>
}

declare module 'vue' {
  interface GlobalComponents {
    'l-button': El<{
      label?: string; variant?: string; size?: string; color?: string; shape?: string
      icon?: string; iconOnly?: boolean; iconPosition?: string; loading?: boolean; disabled?: boolean
      type?: string; badge?: string
    }>
    'l-input': El<{
      value?: string; placeholder?: string; disabled?: boolean; required?: boolean; name?: string
      type?: string; size?: string; variant?: string; invalid?: boolean
      leadingIcon?: string; trailingIcon?: string
    } & LFormEvents>
    'l-textarea': El<{
      value?: string; placeholder?: string; disabled?: boolean; required?: boolean; name?: string
      rows?: number; variant?: string; invalid?: boolean; resize?: string
    } & LFormEvents>
    'l-search-input': El<{
      value?: string; placeholder?: string; disabled?: boolean; size?: string; variant?: string; name?: string
      onClear?: Ev<unknown>
    } & LFormEvents>
    'l-number-input': El<{
      value?: number; min?: number; max?: number; step?: number; precision?: number
      placeholder?: string; size?: string; invalid?: boolean; disabled?: boolean
      onChange?: Ev<number | undefined>
    } & LFormEvents<number | null>>
    'l-select': El<{
      options?: LSelectOption[]; value?: string; placeholder?: string; icon?: string; size?: string
      invalid?: boolean; disabled?: boolean; required?: boolean; name?: string
    } & LFormEvents>
    'l-switch': El<{
      checked?: boolean; disabled?: boolean; name?: string; size?: string; color?: string; label?: string
    } & LFormEvents<boolean>>
    'l-modal': El<{ open?: boolean; heading?: string; onClose?: Ev<unknown>; onUpdate?: Ev<unknown> }>
    'l-alert-dialog': El<{
      open?: boolean; heading?: string; description?: string; variant?: 'default' | 'destructive'
      confirmLabel?: string; cancelLabel?: string
      onClose?: Ev<unknown>; onConfirm?: Ev<unknown>
    }>
    'l-table': El<{
      columns?: LTableColumn[]; data?: readonly object[]; variant?: string; size?: string
      selectable?: boolean; selected?: unknown[]; rowKey?: string; hoverable?: boolean
      emptyMessage?: string; striped?: boolean; loading?: boolean; skeletonRows?: number
      actions?: LTableAction[]; actionsVariant?: string; actionsHeader?: string; builtInActions?: boolean
      onSortchange?: Ev<{ key: string; direction: 'asc' | 'desc' } | null>
      onSelectionchange?: Ev<{ keys: unknown[]; rows: object[] }>
      onAction?: Ev<{ action: string | LTableAction; row: object }>
    }>
    'l-pagination': El<{
      page?: number; totalPages?: number; siblingCount?: number; color?: string
      onPagechange?: Ev<number>
    }>
    'l-badge': El<{ label?: string; variant?: string; color?: string; size?: string; icon?: string; dot?: boolean }>
    'l-card': El<{ variant?: string; padding?: string; hoverable?: boolean; title?: string; footer?: string }>
    'l-skeleton': El<{ variant?: string; width?: string; height?: string; size?: number; lines?: number; animation?: string }>
    'l-empty-state': El<{ icon?: string; heading?: string }>
    'l-error-state': El<{ icon?: string; heading?: string }>
    'l-spinner': El<{ size?: string; color?: string; variant?: string; label?: string }>
    'l-toast': El<{
      open?: boolean; variant?: string; heading?: string; duration?: number; position?: string
      onClose?: Ev<unknown>
    }>
    'l-sidebar': El<{
      items?: LSidebarItem[]; collapsed?: boolean; collapsible?: boolean; header?: string
      defaultActiveItem?: string
    }>
    'l-app': El<{ theme?: string; accent?: string; design?: string; activeVariant?: string; layout?: string[][]; collapseBelow?: string }>
    'l-top': El<object>
    'l-side': El<object>
    'l-main': El<{ padding?: string; margin?: string; rounded?: string }>
    'l-foot': El<object>
    'l-side-toggle': El<{ label?: string }>
    'l-navbar': El<{
      brand?: string; sticky?: boolean; bordered?: boolean; variant?: string; items?: object[]; itemsAlign?: string
    }>
    'l-user-menu': El<{
      name?: string; email?: string; avatarSrc?: string; avatarInitials?: string
      items?: LUserMenuItem[]; align?: string; onItemselect?: Ev<unknown>
    }>
  }
}
export {}
