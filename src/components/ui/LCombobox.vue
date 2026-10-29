<script setup lang="ts">
// NOTE: <l-combobox> filters `options` LOCALLY only (case-insensitive label substring, in the React component);
// it has no remote/async search. For server-side lookups, listen to `search` (the typed text), swap `options`,
// and the element will still locally filter the new list by that same text.
import { onMounted, useTemplateRef } from 'vue'
import type { LComboboxOption } from '../../types/lojee-elements-extra'

defineProps<{ options: LComboboxOption[]; label?: string; error?: string; placeholder?: string }>()
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ search: [text: string] }>()
const el = useTemplateRef<HTMLElement & { value?: string }>('el')

// The element's form-event bridge copies the TYPED text into its own `value` property on every keystroke, and the
// combobox reads that property as "the selected value" and then resets the visible text to the matching option label
// (blanking what the user typed). So ignore writes to `value` that happen while a native input event is being
// dispatched through the shadow root; programmatic writes (Vue binding) still go through.
onMounted(async () => {
  await customElements.whenDefined('l-combobox')
  const host = el.value
  const root = host?.shadowRoot
  if (!host || !root) return
  const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(host), 'value')
  if (!desc?.set || !desc.get) return
  let typing = false
  root.addEventListener(
    'input',
    () => {
      typing = true
      setTimeout(() => (typing = false), 0)
    },
    true,
  )
  Object.defineProperty(host, 'value', {
    configurable: true,
    get: () => desc.get!.call(host),
    set: (v: string) => {
      if (!typing) desc.set!.call(host, v)
    },
  })
})

function onInput(text: string) {
  emit('search', text)
}

// Distinct name so the template tag <l-combobox> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LComboboxWrapper' })
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-fg">{{ label }}</label>
    <l-combobox
      ref="el"
      :options="options"
      :value="model"
      :placeholder="placeholder"
      @change="model = String($event.detail ?? '')"
      @input="onInput(String($event.detail ?? ''))"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
