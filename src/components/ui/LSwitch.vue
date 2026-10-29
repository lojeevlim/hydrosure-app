<script setup lang="ts">
defineProps<{ modelValue?: boolean; label?: string; disabled?: boolean; size?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

// Distinct name so the template tag <l-switch> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LSwitchWrapper' })
</script>

<template>
  <l-switch
    :checked="!!modelValue || undefined"
    :label="label"
    :size="size"
    :disabled="disabled || undefined"
    @update="emit('update:modelValue', !!$event.detail)"
  />
</template>
