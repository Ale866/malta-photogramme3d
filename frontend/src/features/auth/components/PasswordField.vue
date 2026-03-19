<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  label: string
  autocomplete?: string
  error?: string | null
  required?: boolean
}>(), {
  autocomplete: 'current-password',
  error: null,
  hint: null,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: []
  blur: []
}>()

const isVisible = ref(false)

const inputType = computed(() => (
  isVisible.value ? 'text' : 'password'
))

const toggleLabel = computed(() => (
  isVisible.value ? 'Hide password' : 'Show password'
))

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input')
}

function onBlur() {
  emit('blur')
}

function toggleVisibility() {
  isVisible.value = !isVisible.value
}
</script>

<template>
  <label class="form-field">
    <span class="form-label">{{ props.label }}</span>

    <div class="auth-password-field">
      <input :value="props.modelValue" class="form-input auth-password-input" :type="inputType"
        :autocomplete="props.autocomplete" :required="props.required" @input="onInput" @blur="onBlur" />

      <button type="button" class="auth-password-toggle" :aria-label="toggleLabel" :title="toggleLabel"
        @click="toggleVisibility">
        <svg v-if="!isVisible" class="auth-password-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor"
            stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8" />
        </svg>

        <svg v-else class="auth-password-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
          <path d="M10.7 6.3A11.7 11.7 0 0 1 12 6c6.5 0 10 6 10 6a17.4 17.4 0 0 1-4 4.6" fill="none"
            stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
          <path d="M6 6.8C3.5 8.5 2 12 2 12s3.5 6 10 6c1.6 0 3-.3 4.3-.9" fill="none" stroke="currentColor"
            stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
        </svg>
      </button>
    </div>

    <p v-if="props.error" class="auth-field-error">{{ props.error }}</p>
  </label>
</template>
