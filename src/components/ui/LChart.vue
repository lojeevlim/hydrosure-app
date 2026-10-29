<script setup lang="ts">
import { computed } from 'vue'
import type { LChartPoint } from '../../types/lojee-elements-extra'

const props = withDefaults(
  defineProps<{
    type?: 'bar' | 'line' | 'donut'
    data: LChartPoint[]
    height?: number
    color?: string
    variant?: 'default' | 'values'
    showLabels?: boolean
    countUp?: boolean
    /** Show at most about this many labels: every Nth label is kept, the others are blanked (bar/line only). */
    maxLabels?: number
  }>(),
  { type: 'bar', showLabels: true, countUp: true },
)

const points = computed<LChartPoint[]>(() => {
  const n = props.data.length
  if (props.type === 'donut' || !props.maxLabels || n <= props.maxLabels) return props.data
  const step = Math.ceil(n / props.maxLabels)
  return props.data.map((p, i) => (i % step === 0 ? p : { ...p, label: '' }))
})

// Distinct name so the template tag <l-chart> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LChartWrapper' })
</script>

<template>
  <l-chart
    :type="type"
    :data="points"
    v-bind="height === undefined ? {} : { height }"
    :color="color"
    :variant="variant"
    :showLabels="showLabels"
    :countUp="countUp"
  />
</template>
