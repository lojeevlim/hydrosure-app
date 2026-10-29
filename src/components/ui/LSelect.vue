<script setup lang="ts">
import type { LSelectOption } from '../../types/lojee-elements'

defineProps<{
  modelValue?: string
  options: LSelectOption[]
  label?: string
  error?: string
  placeholder?: string
  size?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// Distinct name so the template tag <l-select> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LSelectWrapper' })
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-fg">{{ label }}</label>
    <l-select
      :options="options"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :size="size"
      :disabled="disabled || undefined"
      :invalid="!!error || undefined"
      @update="emit('update:modelValue', String($event.detail))"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
