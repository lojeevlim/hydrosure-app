<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DiscountInput } from '@hydrosure/shared'
import type { LSelectOption } from '../../types/lojee-elements'
import LSelect from '../ui/LSelect.vue'
import LNumberInput from '../ui/LNumberInput.vue'

const props = defineProps<{ modelValue?: DiscountInput; label: string; testid?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: DiscountInput | undefined] }>()

const typeOptions: LSelectOption[] = [
  { label: '%', value: 'percent' },
  { label: 'Amount', value: 'fixed' },
]
const type = ref<DiscountInput['type']>(props.modelValue?.type ?? 'percent')
const value = ref<number | undefined>(props.modelValue?.value)
// <l-number-input> does not clear when its model is reset from outside, so remount it when the store clears the value.
const resetKey = ref(0)

// Resync after the store normalises/clamps the value (or clears it).
watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      type.value = v.type
      value.value = v.value
    } else if (value.value !== undefined) {
      value.value = undefined
      resetKey.value++
    }
  },
)

function commit() {
  const n = value.value
  const next = n !== undefined && Number.isFinite(n) && n > 0 ? ({ type: type.value, value: n } as DiscountInput) : undefined
  const cur = props.modelValue
  if (!next && !cur) return
  if (next && cur && next.type === cur.type && next.value === cur.value) return
  emit('update:modelValue', next)
}
watch(value, commit)
function onType(t: string) {
  type.value = t as DiscountInput['type']
  commit()
}
</script>

<template>
  <div class="flex items-center gap-2 text-xs">
    <span class="text-fg-muted">{{ label }}</span>
    <div class="w-28" :aria-label="`${label} type`"><LSelect :model-value="type" :options="typeOptions" size="sm" @update:model-value="onType" /></div>
    <div class="w-32" :data-testid="testid" :aria-label="`${label} value`">
      <LNumberInput :key="resetKey" v-model="value" :min="0" :step="0.01" :precision="2" size="sm" />
    </div>
  </div>
</template>
