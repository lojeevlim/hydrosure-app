import { defineStore } from 'pinia'
import { ref } from 'vue'

const KEY = 'hydrosure.settings.businessHours'

const hourEnv = (v: string | undefined, fallback: number) => {
  const n = Number(v)
  return v !== undefined && v !== '' && Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback
}
const defaults = { openHour: hourEnv(import.meta.env.VITE_OPEN_HOUR, 8), closeHour: hourEnv(import.meta.env.VITE_CLOSE_HOUR, 20) }

function load() {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null')
    if (Number.isInteger(v?.openHour) && Number.isInteger(v?.closeHour) && v.openHour >= 0 && v.closeHour <= 23 && v.openHour <= v.closeHour) return v as typeof defaults
  } catch { /* fall back to the defaults when storage is unavailable or corrupt */ }
  return defaults
}

/** Business opening/closing hour (0-23), saved in this browser. The dashboard's hourly chart spans these hours. */
export const useSettingsStore = defineStore('settings', () => {
  const initial = load()
  const openHour = ref(initial.openHour)
  const closeHour = ref(initial.closeHour)

  function saveBusinessHours(open: number, close: number) {
    openHour.value = open
    closeHour.value = close
    try { window.localStorage.setItem(KEY, JSON.stringify({ openHour: open, closeHour: close })) } catch { /* ignore storage failures */ }
  }
  return { openHour, closeHour, saveBusinessHours }
})
