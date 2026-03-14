<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'
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

const auth = useAuth()
const mode = ref<AuthMode>(props.initialMode)
const nickname = ref('')
const email = ref('')
const password = ref('')
const nicknameError = ref<string | null>(null)
const emailError = ref<string | null>(null)
const passwordError = ref<string | null>(null)
const formError = ref<string | null>(null)
const isLoading = ref(false)

const title = computed(() =>
  mode.value === 'login' ? props.loginTitle : props.registerTitle
)
const subtitle = computed(() =>
  mode.value === 'login' ? props.loginSubtitle : props.registerSubtitle
)
const submitLabel = computed(() =>
  mode.value === 'login' ? 'Login' : 'Create account'
)

function clearErrors() {
  nicknameError.value = null
  emailError.value = null
  passwordError.value = null
  formError.value = null
}

function switchMode(nextMode: AuthMode) {
  if (isLoading.value || mode.value === nextMode) return
  mode.value = nextMode
  clearErrors()
}

function validate(): boolean {
  clearErrors()

  if (mode.value === 'register' && nickname.value.trim().length < 3) {
    nicknameError.value = 'Nickname must be at least 3 characters'
  }

  if (!email.value.trim()) {
    emailError.value = 'Email is required'
  }

  if (!password.value) {
    passwordError.value = 'Password is required'
  } else if (mode.value === 'register' && password.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
  }

  return !nicknameError.value && !emailError.value && !passwordError.value
}

function applySubmitError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('nickname')) {
    nicknameError.value = message
    return
  }

  if (normalized.includes('email')) {
    emailError.value = message
    return
  }

  if (normalized.includes('password')) {
    passwordError.value = message
    return
  }

  formError.value = message
}

async function onSubmit() {
  if (!validate()) return

  isLoading.value = true

  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value)
    } else {
      await auth.register(email.value, password.value, nickname.value)
    }

    emit('success', mode.value)
  } catch (e: any) {
    applySubmitError(e?.message ?? 'Authentication failed')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-card">
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

    <form class="form-grid" @submit.prevent="onSubmit">
      <label v-if="mode === 'register'" class="form-field">
        <span class="form-label">Nickname</span>
        <input v-model="nickname" class="form-input" type="text" autocomplete="nickname" required />
        <p v-if="nicknameError" class="auth-field-error">{{ nicknameError }}</p>
      </label>

      <label class="form-field">
        <span class="form-label">Email</span>
        <input v-model="email" class="form-input" type="email" autocomplete="email" required />
        <p v-if="emailError" class="auth-field-error">{{ emailError }}</p>
      </label>

      <label class="form-field">
        <span class="form-label">Password</span>
        <input v-model="password" class="form-input" type="password"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required />
        <p v-if="passwordError" class="auth-field-error">{{ passwordError }}</p>
      </label>

      <p v-if="formError" class="auth-field-error">{{ formError }}</p>

      <button class="btn btn-primary btn-block" type="submit" :disabled="isLoading">
        {{ isLoading ? 'Submitting...' : submitLabel }}
      </button>
    </form>
  </div>
</template>
