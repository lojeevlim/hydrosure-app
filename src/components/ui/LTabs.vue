<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'

// Header strip only: every tab gets empty content, and the (empty) tabpanel of <l-tabs> is hidden by injecting a
// style into its shadow root, because the element does not expose the React `classNames` prop. Render the panels
// yourself with v-if / v-show on `index`.
const props = defineProps<{ tabs: { label: string; disabled?: boolean }[] }>()
const index = defineModel<number>('index', { default: 0 })
const el = useTemplateRef<HTMLElement>('el')

const items = computed(() => props.tabs.map((t) => ({ label: t.label, content: '', disabled: t.disabled })))

onMounted(async () => {
  await customElements.whenDefined('l-tabs')
  const root = el.value?.shadowRoot
  if (!root || root.querySelector('style[data-hydrosure-tabs]')) return
  const style = document.createElement('style')
  style.dataset.hydrosureTabs = ''
  // Besides hiding the panel: the sliding underline is drawn with a fixed dark slate that all but vanishes on a dark
  // surface, so draw it with the theme foreground token; on narrow screens tighten the tabs and let the strip scroll
  // (thin visible scrollbar) instead of clipping the last tab.
  style.textContent = [
    '[role="tabpanel"]{display:none!important}',
    '[role="tablist"]{overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}',
    '[role="tablist"]>span[aria-hidden]{background-color:var(--color-fg)!important;height:3px!important}',
    '@media (max-width:480px){[role="tab"]{padding-left:.75rem!important;padding-right:.75rem!important}}',
  ].join('')
  root.appendChild(style)
})

// Keep the selected tab visible when the strip scrolls.
watch(index, async () => {
  await nextTick()
  el.value?.shadowRoot?.querySelectorAll('[role="tab"]')[index.value]?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
})

// Distinct name so the template tag <l-tabs> resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LTabsWrapper' })
</script>

<template>
  <l-tabs ref="el" :tabs="items" :index="index" @change="index = $event.detail" />
</template>
