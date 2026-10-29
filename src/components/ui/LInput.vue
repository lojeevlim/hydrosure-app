<script setup lang="ts">
import { useTemplateRef } from 'vue'

defineProps<{
  modelValue?: string
  label?: string
  error?: string
  placeholder?: string
  type?: string
  size?: string
  variant?: string
  name?: string
  disabled?: boolean
  required?: boolean
  leadingIcon?: string
  trailingIcon?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const el = useTemplateRef<HTMLElement>('el')

function focus() {
  const inner = el.value?.shadowRoot?.querySelector('input')
  ;(inner ?? el.value)?.focus()
}
/** <l-input> ignores a model reset to '', so clear the inner native input too and notify the parent. */
function clear() {
  const inner = el.value?.shadowRoot?.querySelector('input')
  if (inner) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(inner, '')
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }
  emit('update:modelValue', '')
}
defineExpose({ focus, clear })

// Distinct name so the template tag <l-input> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LInputWrapper' })
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-fg">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </label>
    <l-input
      ref="el"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :type="type"
      :size="size"
      :variant="variant"
      :name="name"
      :disabled="disabled || undefined"
      :required="required || undefined"
      :invalid="!!error || undefined"
      :leading-icon="leadingIcon"
      :trailing-icon="trailingIcon"
      @input="emit('update:modelValue', String($event.detail ?? ''))"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
