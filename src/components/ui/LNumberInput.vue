<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import LButton from './LButton.vue'

// Built on <l-input> (lojee-ui), NOT on <l-number-input>. The number element (alpha.18) is unreliable: its r2wc/form-event
// bridge writes the typed *string* into the host's `value` (=> `toFixed is not a function` when `invalid` flips), typing
// '-'/'e' crashes it (React #301), it cannot be cleared, it defaults max to 99, and a value/input echo drops digits when
// typing fast. Here the text is owned by the inner <input>: it is only ever written with the native value setter (like
// LInput.clear()), and the host's own `value` property is neutralised so the element never echoes the typed text back.
const props = withDefaults(
  defineProps<{
    label?: string
    error?: string
    min?: number
    max?: number
    step?: number
    precision?: number
    placeholder?: string
    disabled?: boolean
    size?: string
    /** Show the - / + buttons (and ArrowUp/ArrowDown stepping). On by default, like the element it replaces. */
    stepper?: boolean
    testId?: string
    ariaLabel?: string
  }>(),
  { stepper: true },
)
const model = defineModel<number | undefined>()
const el = useTemplateRef<HTMLElement>('el')

const MAX_DEFAULT = 1_000_000_000
const hi = computed(() => props.max ?? MAX_DEFAULT)
const stepBy = computed(() => props.step ?? 1)
const canNegative = computed(() => props.min === undefined || props.min < 0)

const fmt = (n: number) => (props.precision !== undefined ? n.toFixed(props.precision) : String(n))
const round = (n: number) => Number(n.toFixed(props.precision ?? 10))
const clamp = (n: number) => round(Math.min(hi.value, Math.max(props.min ?? -Infinity, n)))

/** Text -> number; undefined for '', '-', '.', '-.' and anything else that is not a finite number. */
function parse(text: string): number | undefined {
  const t = text.trim()
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/** Keep digits, one '.' (only when precision allows decimals, at most `precision` of them) and a leading '-' (only when negatives are allowed). */
function sanitize(raw: string): string {
  const neg = canNegative.value && raw.trim().startsWith('-')
  const [int = '', ...rest] = raw.replace(/[^\d.]/g, '').split('.')
  let out = int
  if (rest.length && (props.precision === undefined || props.precision > 0)) {
    const frac = rest.join('')
    out += '.' + (props.precision === undefined ? frac : frac.slice(0, props.precision))
  }
  return (neg ? '-' : '') + out
}

const inner = () => el.value?.shadowRoot?.querySelector('input') ?? null
let pending: string | undefined = model.value === undefined ? '' : fmt(model.value)
let writing = false
const currentText = () => inner()?.value ?? pending ?? ''

/** Write the visible text (native setter + input event so the element's React state follows), without reporting it as typing. */
function writeText(s: string) {
  const input = inner()
  if (!input) {
    pending = s
    return
  }
  if (input.value === s) return
  writing = true
  try {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, s)
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  } finally {
    writing = false
  }
}

function onTyped(raw: unknown) {
  if (writing) return
  const text = String(raw ?? '')
  const clean = sanitize(text)
  if (clean !== text) writeText(clean)
  model.value = parse(clean)
}

/** After the parent had a chance to react: show what the model really is (a parent may ignore `undefined`, or clamp the value). */
function showModel() {
  void nextTick(() => {
    const v = model.value
    if (parse(currentText()) !== v) writeText(v === undefined ? '' : fmt(v))
  })
}

/** Blur / Enter: clamp, round and format; anything unparseable ('-', '.') becomes empty. */
function commit() {
  const n = parse(currentText())
  if (n === undefined) {
    writeText('')
    model.value = undefined
  } else {
    const next = clamp(n)
    writeText(fmt(next))
    model.value = next
  }
  showModel()
}

function step(dir: 1 | -1) {
  if (props.disabled) return
  const next = clamp((parse(currentText()) ?? props.min ?? 0) + dir * stepBy.value)
  writeText(fmt(next))
  model.value = next
  showModel()
}
function onArrow(dir: 1 | -1, e: KeyboardEvent) {
  if (!props.stepper) return
  e.preventDefault()
  step(dir)
}

// External changes (dialog reset, cart quantity changed elsewhere, parent set undefined): follow them, but ignore our own echo.
watch(model, (v) => {
  if (parse(currentText()) === v) return
  writeText(v === undefined ? '' : fmt(v))
})

onMounted(async () => {
  const host = el.value
  if (!host) return
  // The form-event bridge writes the typed text into `host.value`, which r2wc turns into attribute + props and then echoes
  // back into the field asynchronously (drops digits when typing fast). The text is owned by the inner input, so ignore it.
  Object.defineProperty(host, 'value', { configurable: true, get: () => undefined, set: () => {} })
  await customElements.whenDefined('l-input')
  for (let i = 0; i < 120 && !inner(); i++) await new Promise((r) => requestAnimationFrame(r))
  const input = inner()
  if (!input) return
  input.setAttribute('inputmode', 'decimal')
  input.setAttribute('autocomplete', 'off')
  if (props.ariaLabel || props.label) input.setAttribute('aria-label', props.ariaLabel ?? props.label ?? '')
  const initial = pending ?? ''
  pending = undefined
  writeText(initial)
})

function focus() {
  const i = inner()
  ;(i ?? el.value)?.focus()
}
defineExpose({ focus })

const atMin = computed(() => model.value !== undefined && props.min !== undefined && model.value <= props.min)
const atMax = computed(() => model.value !== undefined && model.value >= hi.value)

// Distinct name so the template tag resolves to the lojee-ui element typing, not to this wrapper.
defineOptions({ name: 'LNumberInputWrapper' })
</script>

<template>
  <div class="flex flex-col gap-1" :data-testid="testId" :aria-label="ariaLabel">
    <label v-if="label" class="text-sm font-medium text-fg">{{ label }}</label>
    <div class="flex w-full max-w-48 items-stretch gap-1">
      <LButton
        v-if="stepper"
        variant="outline"
        :size="size"
        label="−"
        aria-label="Decrease"
        :disabled="disabled || atMin"
        @click="step(-1)"
      />
      <div class="min-w-0 flex-1">
        <l-input
          ref="el"
          :placeholder="placeholder"
          :size="size"
          :disabled="disabled || undefined"
          :invalid="!!error || undefined"
          @input="onTyped($event.detail)"
          @focusout="commit"
          @keydown.enter="commit"
          @keydown.up="onArrow(1, $event)"
          @keydown.down="onArrow(-1, $event)"
        />
      </div>
      <LButton
        v-if="stepper"
        variant="outline"
        :size="size"
        label="+"
        aria-label="Increase"
        :disabled="disabled || atMax"
        @click="step(1)"
      />
    </div>
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
