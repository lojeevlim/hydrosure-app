<script setup lang="ts">
defineProps<{
  modelValue?: string
  label?: string
  error?: string
  placeholder?: string
  rows?: number
  name?: string
  disabled?: boolean
  required?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// Distinct name so the template tag <l-textarea> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LTextareaWrapper' })
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-fg">{{ label }}</label>
    <l-textarea
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :rows="rows"
      :name="name"
      :disabled="disabled || undefined"
      :required="required || undefined"
      :invalid="!!error || undefined"
      @input="emit('update:modelValue', $event.detail)"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
