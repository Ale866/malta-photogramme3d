<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useRoute } from 'vue-router'
import { useAuth } from '@/features/auth/application/useAuth'
import PasswordField from '@/features/auth/components/PasswordField.vue'
import { AuthApi, AuthApiError } from '@/features/auth/infrastructure/api'

const route = useRoute()
const auth = useAuth()

const token = computed(() => (
  typeof route.query.token === 'string' ? route.query.token : ''
))

const validationMessage = ref<string | null>(null)
const expiresAt = ref<string | null>(null)
const isValidating = ref(false)
const isTokenValid = ref(false)
const isResetComplete = ref(false)

const password = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const confirmPasswordError = ref<string | null>(null)
const formError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const expiresAtLabel = computed(() => {
  if (!expiresAt.value) return null

  const parsed = new Date(expiresAt.value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toLocaleString()
})

function clearSubmitErrors() {
  passwordError.value = null
  confirmPasswordError.value = null
  formError.value = null
}

function applyTokenError(error: unknown) {
  if (error instanceof AuthApiError) {
    validationMessage.value = error.message
  } else if (error instanceof Error) {
    validationMessage.value = error.message
  } else {
    validationMessage.value = 'This password reset link is invalid.'
  }

  isTokenValid.value = false
}

async function validateToken() {
  if (!token.value) {
    validationMessage.value = 'This password reset link is invalid.'
    isTokenValid.value = false
    expiresAt.value = null
    return
  }

  isValidating.value = true
  validationMessage.value = null
  expiresAt.value = null

  try {
    const result = await AuthApi.validateResetPasswordToken(token.value)
    expiresAt.value = result.expiresAt
    isTokenValid.value = true
  } catch (error) {
    applyTokenError(error)
  } finally {
    isValidating.value = false
  }
}

function validateForm() {
  clearSubmitErrors()

  if (!password.value) {
    passwordError.value = 'Password is required'
  } else if (password.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
  }

  if (!confirmPassword.value) {
    confirmPasswordError.value = 'Please confirm your new password'
  } else if (confirmPassword.value !== password.value) {
    confirmPasswordError.value = 'Passwords do not match'
  }

  return !passwordError.value && !confirmPasswordError.value
}

async function onSubmit() {
  if (!isTokenValid.value || !validateForm()) return

  isSubmitting.value = true
  successMessage.value = null

  try {
    const result = await AuthApi.resetPassword({
      token: token.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })

    auth.clearSession()
    isResetComplete.value = true
    successMessage.value = result.message
    password.value = ''
    confirmPassword.value = ''
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.code === 'password_too_short' || error.code === 'password_required') {
        passwordError.value = error.message
      } else if (error.code === 'password_confirmation_mismatch') {
        confirmPasswordError.value = error.message
      } else if (
        error.code === 'password_reset_token_invalid'
        || error.code === 'password_reset_token_expired'
        || error.code === 'password_reset_token_used'
      ) {
        applyTokenError(error)
      } else {
        formError.value = error.message
      }
    } else {
      formError.value = error instanceof Error ? error.message : 'Unable to reset password'
    }
  } finally {
    isSubmitting.value = false
  }
}

watch(
  token,
  () => {
    isResetComplete.value = false
    successMessage.value = null
    password.value = ''
    confirmPassword.value = ''
    clearSubmitErrors()
    void validateToken()
  },
  { immediate: true }
)
</script>

<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="auth-card-header">
        <h1 class="auth-card-title">Reset password</h1>
        <p class="text-muted auth-card-subtitle">
          Choose a new password for your account.
        </p>
      </div>

      <p v-if="isValidating" class="text-muted auth-card-status">
        Validating your reset link...
      </p>

      <div v-else-if="isResetComplete" class="form-grid">
        <p v-if="successMessage" class="text-success auth-card-status">{{ successMessage }}</p>
        <RouterLink class="btn btn-primary btn-block" :to="{ name: 'Login' }">
          Return to login
        </RouterLink>
      </div>

      <div v-else-if="!isTokenValid" class="form-grid">
        <p class="auth-field-error auth-card-status">{{ validationMessage }}</p>
        <RouterLink class="btn btn-primary btn-block" :to="{ name: 'ForgotPassword' }">
          Request a new reset link
        </RouterLink>
      </div>

      <form v-else class="form-grid" @submit.prevent="onSubmit">
        <p v-if="expiresAtLabel" class="text-muted auth-token-meta">
          This link expires on {{ expiresAtLabel }}.
        </p>

        <password-field v-model="password" label="New password" autocomplete="new-password" :error="passwordError"
          required />

        <password-field v-model="confirmPassword" label="Confirm new password" autocomplete="new-password"
          :error="confirmPasswordError" required />

        <p v-if="formError" class="auth-field-error">{{ formError }}</p>

        <button class="btn btn-primary btn-block" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Resetting password...' : 'Reset password' }}
        </button>

        <p class="text-muted auth-card-footer">
          Remembered your password?
          <RouterLink class="auth-inline-link" :to="{ name: 'Login' }">Back to login</RouterLink>
        </p>
      </form>
    </section>
  </div>
</template>
