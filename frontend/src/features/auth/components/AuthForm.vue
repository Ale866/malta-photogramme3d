<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthForm } from '@/features/auth/application/useAuthForm'
import PasswordField from '@/features/auth/components/PasswordField.vue'
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
  consentAccepted,
  nicknameError,
  emailError,
  confirmEmailError,
  passwordError,
  confirmPasswordError,
  consentError,
  formError,
  isLoading,
  isRegisterMode,
  isFormComplete,
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

      <PasswordField
        v-model="password"
        label="Password"
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        :error="passwordError"
        required
        @input="markFieldTouched('password')"
        @blur="markFieldTouched('password')"
      />

      <PasswordField
        v-if="mode === 'register'"
        v-model="confirmPassword"
        label="Confirm password"
        autocomplete="new-password"
        :error="confirmPasswordError"
        required
        @input="markFieldTouched('confirmPassword')"
        @blur="markFieldTouched('confirmPassword')"
      />

      <section v-if="mode === 'register'" class="auth-consent auth-form-span-full" aria-labelledby="auth-consent-title">
        <div class="auth-consent__header">
          <h3 id="auth-consent-title" class="auth-consent__title">Research consent</h3>
          <p class="auth-consent__subtitle text-muted">
            Please read this short consent notice before creating an account.
          </p>
        </div>

        <div class="auth-consent__body">
          <p>
            By registering, you agree to take part in this Final Year Project study evaluating the Malta
            Photogramme3D platform.
          </p>
          <ol class="auth-consent__list">
            <li>
              You have been given clear information about the purpose of the study and may ask questions before
              taking part.
            </li>
            <li>
              Participation is voluntary. You may stop participating at any time without penalty, and where
              technically possible your data can be erased before it is anonymised or published.
            </li>
            <li>
              Your participation consists of creating an account and using this web application as part of the
              evaluation of the FYP system.
            </li>
            <li>
              The only personal data collected during registration is your email address.
            </li>
            <li>
              No direct personal benefit is guaranteed, but the study may help improve this research project and
              future work built on it.
            </li>
            <li>
              Under GDPR and applicable national legislation, you may request access to, correction of, or erasure
              of your personal data where applicable.
            </li>
            <li>
              Your identity will not be revealed in publications, reports, or presentations resulting from this
              study.
            </li>
          </ol>
        </div>

        <label class="auth-consent__check">
          <input
            v-model="consentAccepted"
            class="auth-consent__checkbox"
            type="checkbox"
            @change="markFieldTouched('consent')"
          />
          <span>I have read and understood the consent information and agree to participate in this study.</span>
        </label>
        <p v-if="consentError" class="auth-field-error">{{ consentError }}</p>
      </section>

      <div v-if="mode === 'login'" class="auth-card-actions auth-form-span-full">
        <RouterLink class="auth-inline-link" :to="forgotPasswordRoute">
          Forgot password?
        </RouterLink>
      </div>

      <p v-if="formError" class="auth-field-error auth-form-span-full">{{ formError }}</p>

      <button class="btn btn-primary btn-block auth-form-span-full" type="submit"
        :disabled="isLoading || !isFormComplete">
        {{ isLoading ? 'Submitting...' : submitLabel }}
      </button>
    </form>
  </div>
</template>
