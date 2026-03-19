<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthForm } from '@/features/auth/application/useAuthForm'
import type { AuthMode } from '@/features/auth/domain/AuthMode'

const props = withDefaults(defineProps<{
  initialMode?: AuthMode
  loginTitle?: string
  registerTitle?: string
  loginSubtitle?: string | null
  registerSubtitle?: string | null
}>(), {
  initialMode: 'login',
  loginTitle: 'Login',
  registerTitle: 'Create account',
  loginSubtitle: null,
  registerSubtitle: null,
})

const emit = defineEmits<{
  success: [mode: AuthMode]
}>()

const route = useRoute()
const {
  mode,
  nickname,
  email,
  confirmEmail,
  password,
  confirmPassword,
  nicknameError,
  emailError,
  confirmEmailError,
  passwordError,
  confirmPasswordError,
  formError,
  isLoading,
  isRegisterMode,
  switchMode,
  markFieldTouched,
  submit,
} = useAuthForm({
  initialMode: props.initialMode,
})

const title = computed(() =>
  mode.value === 'login' ? props.loginTitle : props.registerTitle
)
const subtitle = computed(() =>
  mode.value === 'login' ? props.loginSubtitle : props.registerSubtitle
)
const submitLabel = computed(() =>
  mode.value === 'login' ? 'Login' : 'Create account'
)
const forgotPasswordRoute = computed(() => {
  const next = typeof route.query.next === 'string' ? route.query.next : undefined

  return next
    ? { name: 'ForgotPassword', query: { next } }
    : { name: 'ForgotPassword' }
})

async function onSubmit() {
  const successfulMode = await submit()
  if (successfulMode) emit('success', successfulMode)
}
</script>

<template>
  <div class="auth-card" :class="{ 'auth-card--register': isRegisterMode }">
    <div class="auth-card-header">
      <h2 class="auth-card-title">{{ title }}</h2>
      <p v-if="subtitle" class="text-muted auth-card-subtitle">{{ subtitle }}</p>
    </div>

    <div class="auth-card-switch" role="tablist" aria-label="Authentication mode">
      <button type="button" class="auth-card-switch-button" :class="{ 'is-active': mode === 'login' }"
        @click="switchMode('login')">
        Login
      </button>
      <button type="button" class="auth-card-switch-button" :class="{ 'is-active': mode === 'register' }"
        @click="switchMode('register')">
        Register
      </button>
    </div>

    <form class="form-grid auth-form-grid" :class="{ 'auth-form-grid--register': isRegisterMode }"
      @submit.prevent="onSubmit">
      <label v-if="mode === 'register'" class="form-field auth-form-span-full">
        <span class="form-label">Nickname</span>
        <input v-model="nickname" class="form-input" type="text" autocomplete="nickname" required
          @input="markFieldTouched('nickname')" @blur="markFieldTouched('nickname')" />
        <p v-if="nicknameError" class="auth-field-error">{{ nicknameError }}</p>
      </label>

      <label class="form-field">
        <span class="form-label">Email</span>
        <input v-model="email" class="form-input" type="email" autocomplete="email" required
          @input="markFieldTouched('email')" @blur="markFieldTouched('email')" />
        <p v-if="emailError" class="auth-field-error">{{ emailError }}</p>
      </label>

      <label v-if="mode === 'register'" class="form-field">
        <span class="form-label">Confirm email</span>
        <input v-model="confirmEmail" class="form-input" type="email" autocomplete="email" required
          @input="markFieldTouched('confirmEmail')" @blur="markFieldTouched('confirmEmail')" />
        <p v-if="confirmEmailError" class="auth-field-error">{{ confirmEmailError }}</p>
      </label>

      <label class="form-field">
        <span class="form-label">Password</span>
        <input v-model="password" class="form-input" type="password"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required
          @input="markFieldTouched('password')" @blur="markFieldTouched('password')" />
        <p v-if="passwordError" class="auth-field-error">{{ passwordError }}</p>
      </label>

      <label v-if="mode === 'register'" class="form-field">
        <span class="form-label">Confirm password</span>
        <input v-model="confirmPassword" class="form-input" type="password" autocomplete="new-password" required
          @input="markFieldTouched('confirmPassword')" @blur="markFieldTouched('confirmPassword')" />
        <p v-if="confirmPasswordError" class="auth-field-error">{{ confirmPasswordError }}</p>
      </label>

      <div v-if="mode === 'login'" class="auth-card-actions auth-form-span-full">
        <RouterLink class="auth-inline-link" :to="forgotPasswordRoute">
          Forgot password?
        </RouterLink>
      </div>

      <p v-if="formError" class="auth-field-error auth-form-span-full">{{ formError }}</p>

      <button class="btn btn-primary btn-block auth-form-span-full" type="submit" :disabled="isLoading">
        {{ isLoading ? 'Submitting...' : submitLabel }}
      </button>
    </form>
  </div>
</template>
