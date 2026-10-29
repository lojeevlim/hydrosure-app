<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    variant?: string
    size?: string
    color?: string
    icon?: string
    iconOnly?: boolean
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { type: 'button' },
)

// A disabled/loading web-component host can still emit clicks; swallow them before parent listeners run.
function guard(e: MouseEvent, blocked: boolean) {
  if (blocked) {
    e.stopImmediatePropagation()
    e.preventDefault()
  }
}

// Distinct name so the template tag <l-button> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LButtonWrapper' })
</script>

<template>
  <l-button
    :variant="variant"
    :size="size"
    :color="color"
    :icon="icon"
    :icon-only="iconOnly || undefined"
    :loading="loading || undefined"
    :disabled="disabled || undefined"
    :type="type"
    @click.capture="guard($event, !!(disabled || loading))"
  >
    <!-- The element's own `label` fallback is suppressed by Vue's empty anchor text nodes, so render the label as slot content. -->
    <slot>{{ label }}</slot>
  </l-button>
</template>
