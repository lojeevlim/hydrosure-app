<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import LSkeleton from './LSkeleton.vue'

const props = defineProps<{
  label: string
  value: string | number
  /** Percentage change vs the previous period; null/undefined hides the trend line. >= 0 is "up", < 0 is "down". */
  delta?: number | null
  /** Small caption under the card, e.g. "vs previous period". */
  hint?: string
  tone?: 'default' | 'warn' | 'danger'
  loading?: boolean
  icon?: string
}>()

const trend = computed(() => (props.delta == null ? undefined : props.delta >= 0 ? 'up' : 'down'))
const change = computed(() => (props.delta == null ? undefined : `${Math.abs(props.delta).toFixed(1)}%`))
const color = computed(() => (props.tone === 'warn' ? 'amber' : props.tone === 'danger' ? 'rose' : undefined))

const el = useTemplateRef<HTMLElement>('el')

// Make the card fill the grid cell: the host becomes a column flexbox and the inner card (the only element the
// component renders besides its <style>) flexes to fill it, so every card in a row has the same visible box height.
async function fillHost() {
  await nextTick()
  await customElements.whenDefined('l-stat')
  const root = el.value?.shadowRoot
  if (!root || root.querySelector('style[data-hydrosure-stat]')) return
  const style = document.createElement('style')
  style.dataset.hydrosureStat = ''
  style.textContent = ':host{display:flex!important;flex-direction:column}[data-theme]>div{flex:1 1 auto;box-sizing:border-box}'
  root.appendChild(style)
}
watch(el, (v) => { if (v) fillHost() }, { immediate: true, flush: 'post' })

// Distinct name so the template tag <l-stat> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LStatWrapper' })
</script>

<template>
  <div class="flex h-full flex-col gap-1">
    <LSkeleton v-if="loading" variant="rect" class="block flex-1" style="min-height: 9.125rem" />
    <l-stat
      v-else
      ref="el"
      class="min-h-0 flex-1"
      :label="label"
      :value="String(value)"
      :change="change"
      :trend="trend ?? 'neutral'"
      :icon="icon"
      :color="color"
      :count-up="true"
    />
    <!-- Always reserved (two lines on very narrow screens) so cards with and without a hint stay the same height. -->
    <p class="min-h-4 text-xs text-fg-muted max-[359px]:min-h-8">{{ loading ? '' : hint }}</p>
  </div>
</template>
