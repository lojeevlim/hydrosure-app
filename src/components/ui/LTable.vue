<script setup lang="ts" generic="T extends object">
import type { LTableAction, LTableColumn } from '../../types/lojee-elements'

export type SortState = { key: string; direction: 'asc' | 'desc' } | null

withDefaults(
  defineProps<{
    columns: LTableColumn[]
    rows: readonly T[]
    rowKey?: string
    actions?: LTableAction[]
    selectable?: boolean
    selected?: unknown[]
    loading?: boolean
    emptyMessage?: string
    skeletonRows?: number
    striped?: boolean
    size?: string
  }>(),
  { emptyMessage: 'No records found', skeletonRows: 6 },
)

const emit = defineEmits<{
  sort: [state: SortState]
  select: [keys: unknown[], rows: T[]]
  action: [action: string, row: T]
}>()

function onAction(e: CustomEvent<{ action: string | LTableAction; row: object }>) {
  const a = e.detail.action
  emit('action', typeof a === 'string' ? a : (a.value ?? a.label), e.detail.row as T)
}

// Distinct name so the template tag <l-table> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LTableWrapper' })
</script>

<template>
  <l-table
    :columns="columns"
    :data="rows"
    :row-key="rowKey"
    :actions="actions"
    :built-in-actions="false"
    :selectable="selectable || undefined"
    :selected="selected"
    :loading="loading || undefined"
    :empty-message="emptyMessage"
    :skeleton-rows="skeletonRows"
    :striped="striped || undefined"
    :size="size"
    :hoverable="true"
    @sortchange="emit('sort', $event.detail)"
    @selectionchange="emit('select', $event.detail.keys, $event.detail.rows as T[])"
    @action="onAction"
  />
</template>
