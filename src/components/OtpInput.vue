<!--
  OtpInput.vue — segmented one-time-code input.

  Renders `length` single-character boxes for entering a verification code.
  The code charset is alphanumeric (letters are auto-uppercased); this matches
  the backend OTP alphabet (A-Z + 2-9, case-insensitive).

  Props:
    modelValue  v-model bound string (uppercased, max `length` chars)
    length      number of boxes (default 8)
    disabled    disable all boxes
    autofocus   focus the first box on mount

  Emits:
    update:modelValue  on every change
    complete           once all boxes are filled (payload: the full code)
-->
<template>
  <div
    class="otp-input"
    :style="{ '--otp-cols': length, '--otp-cols-mobile': mobileColumns }"
  >
    <input
      v-for="(_, i) in length"
      :key="i"
      :ref="el => setRef(el, i)"
      :value="boxes[i]"
      type="text"
      inputmode="text"
      autocapitalize="characters"
      autocomplete="one-time-code"
      spellcheck="false"
      maxlength="1"
      :disabled="disabled"
      class="otp-box"
      :class="{ 'otp-box--filled': !!boxes[i] }"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste(i, $event)"
      @focus="onFocus($event)"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  length?: number
  disabled?: boolean
  autofocus?: boolean
}>(), {
  length: 8,
  disabled: false,
  autofocus: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'complete', value: string): void
}>()

const boxes = ref<string[]>(Array.from({ length: props.length }, () => ''))
const inputs = ref<(HTMLInputElement | null)[]>([])

// Narrow screens lay the boxes out in rows of four (an 8-digit code becomes two
// even rows) instead of letting them wrap into a ragged 7 + 1.
const mobileColumns = computed(() => Math.min(4, props.length))

const setRef = (el: unknown, i: number) => {
  inputs.value[i] = el as HTMLInputElement | null
}

const CHAR_RE = /[A-Z0-9]/

const sanitize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

const emitValue = () => {
  const code = boxes.value.join('')
  emit('update:modelValue', code)
  if (code.length === props.length && boxes.value.every(c => c !== '')) {
    emit('complete', code)
  }
}

const focusBox = (i: number) => {
  const el = inputs.value[i]
  if (el) {
    el.focus()
    el.select()
  }
}

const distribute = (from: number, chars: string) => {
  let idx = from
  for (const ch of chars) {
    if (idx >= props.length) break
    boxes.value[idx] = ch
    idx++
  }
  return idx
}

const onInput = (i: number, e: Event) => {
  const target = e.target as HTMLInputElement
  const raw = sanitize(target.value)
  if (raw.length > 1) {
    // Multi-char arrival (mobile one-time-code autofill dumps the whole code
    // into the focused box) → spread it across the following boxes.
    const idx = distribute(i, raw)
    target.value = boxes.value[i]
    focusBox(Math.min(idx, props.length - 1))
    emitValue()
    return
  }
  const ch = raw.slice(-1) // keep only the last valid char typed
  boxes.value[i] = ch
  target.value = ch
  if (ch && i < props.length - 1) focusBox(i + 1)
  emitValue()
}

const onKeydown = (i: number, e: KeyboardEvent) => {
  if (e.key === 'Backspace') {
    if (boxes.value[i]) {
      boxes.value[i] = ''
      emitValue()
    } else if (i > 0) {
      e.preventDefault()
      boxes.value[i - 1] = ''
      focusBox(i - 1)
      emitValue()
    }
  } else if (e.key === 'ArrowLeft' && i > 0) {
    e.preventDefault()
    focusBox(i - 1)
  } else if (e.key === 'ArrowRight' && i < props.length - 1) {
    e.preventDefault()
    focusBox(i + 1)
  } else if (e.key.length === 1 && !CHAR_RE.test(e.key.toUpperCase()) && !e.ctrlKey && !e.metaKey) {
    // block non-alphanumeric single-char keys so they don't flash into the box
    e.preventDefault()
  }
}

const onPaste = (i: number, e: ClipboardEvent) => {
  e.preventDefault()
  const pasted = sanitize(e.clipboardData?.getData('text') ?? '')
  if (!pasted) return
  const idx = distribute(i, pasted)
  focusBox(Math.min(idx, props.length - 1))
  emitValue()
}

const onFocus = (e: FocusEvent) => {
  ;(e.target as HTMLInputElement).select()
}

// Keep boxes in sync when the parent resets or programmatically sets the value.
watch(() => props.modelValue, (val) => {
  const clean = sanitize(val).slice(0, props.length)
  if (clean === boxes.value.join('')) return
  boxes.value = Array.from({ length: props.length }, (_, i) => clean[i] ?? '')
  // When the parent resets the code (e.g. after a failed attempt), return focus to the first box.
  if (clean === '' && !props.disabled) nextTick(() => focusBox(0))
})

onMounted(() => {
  if (props.autofocus) nextTick(() => focusBox(0))
})
</script>

<style scoped>
.otp-input {
  display: grid;
  grid-template-columns: repeat(var(--otp-cols), auto);
  gap: 8px;
  justify-content: center;
}

.otp-box {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
  background-color: rgb(var(--v-theme-surface-container-high));
  border: 1.5px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 12px;
  outline: none;
  caret-color: rgb(var(--v-theme-primary));
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.otp-box:hover:not(:disabled) {
  border-color: rgba(var(--v-theme-on-surface), 0.32);
}

.otp-box:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.18);
}

.otp-box--filled {
  border-color: rgba(var(--v-theme-primary), 0.6);
}

.otp-box:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .otp-input {
    grid-template-columns: repeat(var(--otp-cols-mobile), auto);
    gap: 10px 8px;
  }

  .otp-box {
    width: 48px;
    height: 56px;
  }
}
</style>
