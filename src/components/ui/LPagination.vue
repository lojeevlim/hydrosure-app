<script setup lang="ts">
defineProps<{ totalPages: number; siblingCount?: number }>()
const page = defineModel<number>('page', { default: 1 })

// Distinct name so the template tag <l-pagination> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LPaginationWrapper' })
</script>

<template>
  <l-pagination
    :page="page"
    :total-pages="totalPages"
    :sibling-count="siblingCount"
    @pagechange="page = $event.detail"
  />
</template>
