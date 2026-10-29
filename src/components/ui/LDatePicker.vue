<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

// v-model is a native-date string in YYYY-MM-DD, '' when cleared.
defineProps<{ label?: string; error?: string; size?: string; disabled?: boolean }>()
const model = defineModel<string>({ default: '' })
const el = useTemplateRef<HTMLElement>('el')

/** <l-date-picker> ignores a model reset to '' (and its clear button), so clear the inner native input too. */
watch(model, (v) => {
  const inner = el.value?.shadowRoot?.querySelector('input')
  if (v === '' && inner && inner.value !== '') {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(inner, '')
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }
})

// Distinct name so the template tag <l-date-picker> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LDatePickerWrapper' })
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-fg">{{ label }}</label>
    <l-date-picker
      ref="el"
      :value="model"
      :size="size"
      :disabled="disabled || undefined"
      :invalid="!!error || undefined"
      @input="model = String($event.detail ?? '')"
      @clear="model = ''"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
