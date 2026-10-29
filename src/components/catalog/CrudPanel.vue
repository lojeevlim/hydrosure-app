<script setup lang="ts" generic="Row extends { id: string }">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import type { ZodType } from 'zod'
import LButton from '../ui/LButton.vue'
import LInput from '../ui/LInput.vue'
import LSelect from '../ui/LSelect.vue'
import LTextarea from '../ui/LTextarea.vue'
import LTable from '../ui/LTable.vue'
import LModal from '../ui/LModal.vue'
import EmptyState from '../ui/EmptyState.vue'
import ErrorState from '../ui/ErrorState.vue'
import { api, errorMessage } from '../../lib/api'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import { apiFieldErrors, fieldErrors } from '../products/formErrors'
import type { LSelectOption, LTableColumn } from '../../types/lojee-elements'

export interface CrudField<R> {
  key: string
  label: string
  kind?: 'text' | 'email' | 'textarea' | 'select'
  required?: boolean
  /** Select options, derived from the loaded rows and the row being edited (null on create). */
  options?: (rows: R[], editing: R | null) => LSelectOption[]
}

const props = defineProps<{
  endpoint: string // e.g. '/brands'
  noun: string // e.g. 'brand'
  nounPlural: string
  columns: LTableColumn[]
  fields: CrudField<Row>[]
  schema: ZodType
  /** Projects a row into flat table cells (defaults to the row itself). */
  mapRow?: (row: Row, all: Row[]) => object
}>()

const toast = useToast()
const confirm = useConfirm()

const rows = shallowRef<Row[]>([])
const loading = ref(true)
const loadError = ref('')
const formOpen = ref(false)
const editing = shallowRef<Row | null>(null)
const saving = ref(false)
const form = reactive<Record<string, string>>({})
const errors = reactive<Record<string, string>>({})

const labels = computed(() => Object.fromEntries(props.fields.map((f) => [f.key, f.label])))
const tableRows = computed(() => (props.mapRow ? rows.value.map((r) => props.mapRow!(r, rows.value)) : rows.value) as unknown as readonly Row[])
const actions = [
  { label: 'Edit', value: 'edit', icon: 'pencil' },
  { label: 'Delete', value: 'delete', icon: 'trash-2', color: 'danger' },
]

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    rows.value = (await api.get<Row[]>(props.endpoint)).data
  } catch (e) {
    loadError.value = errorMessage(e, `Could not load ${props.nounPlural}`)
  } finally {
    loading.value = false
  }
}

function openForm(row: Row | null) {
  editing.value = row
  for (const k of Object.keys(errors)) delete errors[k]
  for (const f of props.fields) {
    const v = row ? (row as Record<string, unknown>)[f.key] : ''
    form[f.key] = v == null ? '' : String(v)
  }
  formOpen.value = true
}

async function submit() {
  if (saving.value) return
  for (const k of Object.keys(errors)) delete errors[k]
  const payload: Record<string, string | null> = {}
  for (const f of props.fields) {
    const v = (form[f.key] ?? '').trim()
    payload[f.key] = v === '' && !f.required ? null : v
  }
  const parsed = props.schema.safeParse(payload)
  if (!parsed.success) {
    Object.assign(errors, fieldErrors(parsed.error, labels.value))
    return
  }
  saving.value = true
  try {
    if (editing.value) await api.patch(`${props.endpoint}/${editing.value.id}`, parsed.data)
    else await api.post(props.endpoint, parsed.data)
    toast.success(`${cap(props.noun)} ${editing.value ? 'updated' : 'created'}`)
    formOpen.value = false
    await load()
  } catch (e) {
    const fe = apiFieldErrors(e, labels.value)
    if (Object.keys(fe).length) Object.assign(errors, fe)
    else toast.error(errorMessage(e, `Could not save the ${props.noun}`))
  } finally {
    saving.value = false
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

async function onAction(action: string, r: Row) {
  const row = rows.value.find((x) => x.id === r.id) ?? r
  if (action === 'edit') return openForm(row)
  if (action !== 'delete') return
  const label = (row as { name?: string }).name ?? props.noun
  const ok = await confirm({
    heading: `Delete ${props.noun}?`,
    description: `"${label}" will be permanently deleted. This cannot be undone.`,
    confirmLabel: 'Delete',
    destructive: true,
  })
  if (!ok) return
  try {
    await api.delete(`${props.endpoint}/${row.id}`)
    toast.success(`${cap(props.noun)} deleted`)
    await load()
  } catch (e) {
    // 409 IN_USE carries "Record is referenced by other data"; surface it with context.
    toast.error(errorMessage(e, `Could not delete the ${props.noun}`), `Cannot delete ${props.noun}`)
  }
}

defineExpose({ load })
onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm text-fg-muted">{{ rows.length }} {{ rows.length === 1 ? props.noun : props.nounPlural }}</p>
      <LButton icon="plus" @click="openForm(null)">{{ `New ${props.noun}` }}</LButton>
    </div>

    <ErrorState v-if="loadError" :heading="`Could not load ${props.nounPlural}`" :message="loadError" @retry="load" />
    <EmptyState v-else-if="!loading && !rows.length" icon="folder" :heading="`No ${props.nounPlural} yet`" :description="`Create your first ${props.noun}.`" />
    <div v-else class="overflow-x-auto">
      <LTable :columns="columns" :rows="tableRows" row-key="id" :actions="actions" :loading="loading" @action="onAction" />
    </div>

    <LModal v-model:open="formOpen" :heading="editing ? `Edit ${props.noun}` : `New ${props.noun}`">
      <form class="w-[min(28rem,85vw)] space-y-4 p-1" novalidate @submit.prevent="submit">
        <template v-for="f in fields" :key="f.key">
          <LSelect
            v-if="f.kind === 'select'"
            v-model="form[f.key]"
            :label="f.label"
            :options="f.options?.(rows, editing) ?? []"
            :error="errors[f.key]"
          />
          <LTextarea v-else-if="f.kind === 'textarea'" v-model="form[f.key]" :label="f.label" :rows="3" :error="errors[f.key]" />
          <LInput v-else v-model="form[f.key]" :label="f.label" :type="f.kind === 'email' ? 'email' : 'text'" :required="f.required" :error="errors[f.key]" />
        </template>
        <div class="flex justify-end gap-2 pt-2">
          <LButton variant="outline" :disabled="saving" @click="formOpen = false">Cancel</LButton>
          <LButton :loading="saving" @click="submit">{{ editing ? 'Save changes' : `Create ${props.noun}` }}</LButton>
        </div>
      </form>
    </LModal>
  </div>
</template>
