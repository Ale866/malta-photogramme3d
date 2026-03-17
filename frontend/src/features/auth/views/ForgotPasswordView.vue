<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AuthApi, AuthApiError } from '@/features/auth/infrastructure/api'

const email = ref('')
const emailError = ref<string | null>(null)
const formError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isLoading = ref(false)

function clearMessages() {
  emailError.value = null
  formError.value = null
}

function validate() {
  clearMessages()

  if (!email.value.trim()) {
    emailError.value = 'Email is required'
  }

  return !emailError.value
}

async function onSubmit() {
  if (!validate()) return

  isLoading.value = true
  successMessage.value = null

  try {
    const result = await AuthApi.forgotPassword(email.value)
    successMessage.value = result.message
  } catch (error) {
    if (error instanceof AuthApiError && error.code === 'email_required') {
      emailError.value = error.message
    } else {
      formError.value = error instanceof Error ? error.message : 'Unable to send reset link'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="auth-card-header">
        <h1 class="auth-card-title">Forgot password</h1>
        <p class="text-muted auth-card-subtitle">
          Enter your email address and we’ll send you a password reset link if an account exists.
        </p>
      </div>

      <form class="form-grid" @submit.prevent="onSubmit">
        <label class="form-field">
          <span class="form-label">Email</span>
          <input v-model="email" class="form-input" type="email" autocomplete="email" required />
          <p v-if="emailError" class="auth-field-error">{{ emailError }}</p>
        </label>

        <p v-if="successMessage" class="text-success auth-card-status">{{ successMessage }}</p>
        <p v-if="formError" class="auth-field-error">{{ formError }}</p>

        <button class="btn btn-primary btn-block" type="submit" :disabled="isLoading">
          {{ isLoading ? 'Sending link...' : 'Send reset link' }}
        </button>
      </form>

      <p class="text-muted auth-card-footer">
        Remembered your password?
        <RouterLink class="auth-inline-link" :to="{ name: 'Login' }">Back to login</RouterLink>
      </p>
    </section>
  </div>
</template>
