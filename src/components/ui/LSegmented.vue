<script setup lang="ts">
// Segmented control built from <l-button-group> + <l-segment-button>. The group is NOT `selectable`: `active` is
// driven solely from v-model so an external change can never disagree with the group's own internal selection.
// Overflows horizontally (scrolls) instead of wrapping, e.g. for POS category chips.
const props = defineProps<{
  options: { label: string; value: string; icon?: string }[]
  size?: string
  testId?: string
  ariaLabel?: string
}>()
const model = defineModel<string>({ default: '' })

function onItem(e: CustomEvent<{ index: number; label: string }>) {
  const opt = props.options[e.detail.index]
  if (opt) model.value = opt.value
}

// Distinct name so the template tag resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LSegmentedWrapper' })
</script>

<template>
  <div class="max-w-full overflow-x-auto pb-1" :data-testid="testId" :aria-label="ariaLabel">
    <l-button-group class="block w-max" @itemclick="onItem">
      <l-segment-button
        v-for="o in options"
        :key="o.value"
        class="whitespace-nowrap"
        :icon="o.icon"
        :active="o.value === model"
        >{{ o.label }}</l-segment-button
      >
    </l-button-group>
  </div>
</template>
