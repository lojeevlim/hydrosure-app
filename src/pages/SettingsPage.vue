<script setup lang="ts">
import { computed, ref } from 'vue'
import LButton from '../components/ui/LButton.vue'
import LSelect from '../components/ui/LSelect.vue'
import { useSettingsStore } from '../stores/settings'
import { useToast } from '../composables/useToast'

const settings = useSettingsStore()
const toast = useToast()

const hourOptions = Array.from({ length: 24 }, (_, h) => ({
  label: `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`,
  value: String(h),
}))
const open = ref(String(settings.openHour))
const close = ref(String(settings.closeHour))
const error = computed(() => (Number(open.value) > Number(close.value) ? 'Closing time must not be before opening time' : ''))

function save() {
  if (error.value) return
  settings.saveBusinessHours(Number(open.value), Number(close.value))
  toast.success('Business hours saved')
}
</script>

<template>
  <div class="max-w-xl space-y-4">
    <div>
      <h2 class="text-xl font-semibold text-fg">Settings</h2>
      <p class="text-sm text-fg-muted">Business hours set the range of the hourly sales chart on the dashboard. Saved in this browser.</p>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <LSelect v-model="open" label="Opening time" :options="hourOptions" />
      <LSelect v-model="close" label="Closing time" :options="hourOptions" :error="error" />
    </div>
    <LButton label="Save" :disabled="!!error" @click="save" />
  </div>
</template>
