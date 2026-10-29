<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

defineProps<{ placeholder?: string; size?: string; disabled?: boolean }>()
const model = defineModel<string>({ default: '' })
const el = useTemplateRef<HTMLElement>('el')

function focus() {
  const inner = el.value?.shadowRoot?.querySelector('input')
  ;(inner ?? el.value)?.focus()
}
/** Same technique as LInput.clear(): the element ignores a model reset to '', so clear the inner native input too. */
function clear() {
  const inner = el.value?.shadowRoot?.querySelector('input')
  if (inner) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(inner, '')
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }
  model.value = ''
}
// The element ignores any reset to '' (parent code, or its own clear button), so mirror it into the inner input.
watch(model, (v) => {
  if (v === '' && el.value?.shadowRoot?.querySelector('input')?.value) clear()
})
defineExpose({ focus, clear })

// Distinct name so the template tag <l-search-input> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LSearchInputWrapper' })
</script>

<template>
  <l-search-input
    ref="el"
    :value="model"
    :placeholder="placeholder"
    :size="size"
    :disabled="disabled || undefined"
    @input="model = String($event.detail ?? '')"
    @clear="model = ''"
  />
</template>
