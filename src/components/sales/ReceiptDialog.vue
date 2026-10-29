<script setup lang="ts">
import LButton from '../ui/LButton.vue'
import LModal from '../ui/LModal.vue'
import ReceiptView from './ReceiptView.vue'
import type { ReceiptDto } from './types'

defineProps<{ sale: ReceiptDto | null; closeLabel?: string }>()
const open = defineModel<boolean>('open', { default: false })

function print() {
  window.print()
}
</script>

<template>
  <LModal v-model:open="open" :heading="sale ? `Receipt ${sale.receiptNo}` : 'Receipt'">
    <div v-if="sale" class="flex flex-col gap-3">
      <div class="max-h-[60vh] overflow-auto rounded border border-border">
        <ReceiptView :sale="sale" />
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <LButton variant="outline" data-testid="receipt-print" @click="print">Print</LButton>
        <LButton data-testid="receipt-close" @click="open = false">{{ closeLabel ?? 'Close' }}</LButton>
      </div>
    </div>
  </LModal>

  <!-- Print-only copy outside #app; forced to the light theme so paper output stays readable. -->
  <Teleport to="body">
    <div v-if="open && sale" class="receipt-print-host" data-theme="light">
      <ReceiptView :sale="sale" />
    </div>
  </Teleport>
</template>

<style>
.receipt-print-host { display: none; }
@media print {
  body > #app { display: none !important; }
  .receipt-print-host { display: block !important; background: white; color: black; }
  .receipt-print-host article { max-width: 80mm; }
}
</style>
