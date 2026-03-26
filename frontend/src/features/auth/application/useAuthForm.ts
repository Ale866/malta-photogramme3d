import { computed, ref, watch } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'
import type { AuthMode } from '@/features/auth/domain/AuthMode'

type FieldName = 'nickname' | 'email' | 'confirmEmail' | 'password' | 'confirmPassword' | 'consent'

type UseAuthFormOptions = {
  initialMode?: AuthMode
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmailFormat(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))
}

export function useAuthForm(options: UseAuthFormOptions = {}) {
  const auth = useAuth()
  const mode = ref<AuthMode>(options.initialMode ?? 'login')

  const nickname = ref('')
  const email = ref('')
  const confirmEmail = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const consentAccepted = ref(false)

  const nicknameError = ref<string | null>(null)
  const emailError = ref<string | null>(null)
  const confirmEmailError = ref<string | null>(null)
  const passwordError = ref<string | null>(null)
  const confirmPasswordError = ref<string | null>(null)
  const consentError = ref<string | null>(null)
  const formError = ref<string | null>(null)

  const isLoading = ref(false)
  const hasSubmitted = ref(false)

  const nicknameTouched = ref(false)
  const emailTouched = ref(false)
  const confirmEmailTouched = ref(false)
  const passwordTouched = ref(false)
  const confirmPasswordTouched = ref(false)
  const consentTouched = ref(false)

  const isRegisterMode = computed(() => mode.value === 'register')
  const isFormComplete = computed(() => {
    const hasValidEmail = isValidEmailFormat(email.value)

    if (!isRegisterMode.value) {
      return hasValidEmail && password.value.length > 0
    }

    return nickname.value.trim().length >= 3
      && hasValidEmail
      && confirmEmail.value.trim().length > 0
      && normalizeEmail(email.value) === normalizeEmail(confirmEmail.value)
      && password.value.length >= 6
      && confirmPassword.value.length > 0
      && password.value === confirmPassword.value
      && consentAccepted.value
  })

  function clearErrors() {
    nicknameError.value = null
    emailError.value = null
    confirmEmailError.value = null
    passwordError.value = null
    confirmPasswordError.value = null
    consentError.value = null
    formError.value = null
  }

  function resetInteractionState() {
    hasSubmitted.value = false
    nicknameTouched.value = false
    emailTouched.value = false
    confirmEmailTouched.value = false
    passwordTouched.value = false
    confirmPasswordTouched.value = false
    consentTouched.value = false
  }

  function resetValues() {
    nickname.value = ''
    email.value = ''
    confirmEmail.value = ''
    password.value = ''
    confirmPassword.value = ''
    consentAccepted.value = false
  }

  function shouldValidateField(touched: boolean) {
    return hasSubmitted.value || touched
  }

  function markFieldTouched(field: FieldName) {
    switch (field) {
      case 'nickname':
        nicknameTouched.value = true
        break
      case 'email':
        emailTouched.value = true
        break
      case 'confirmEmail':
        confirmEmailTouched.value = true
        break
      case 'password':
        passwordTouched.value = true
        break
      case 'confirmPassword':
        confirmPasswordTouched.value = true
        break
      case 'consent':
        consentTouched.value = true
        break
    }
  }

  function validateNickname() {
    if (!isRegisterMode.value) {
      nicknameError.value = null
      return true
    }

    if (!shouldValidateField(nicknameTouched.value)) {
      nicknameError.value = null
      return true
    }

    const value = nickname.value.trim()

    if (!value) {
      nicknameError.value = 'Nickname is required'
    } else if (value.length < 3) {
      nicknameError.value = 'Nickname must be at least 3 characters'
    } else {
      nicknameError.value = null
    }

    return !nicknameError.value
  }

  function validateEmail() {
    if (!shouldValidateField(emailTouched.value)) {
      emailError.value = null
      return true
    }

    if (!email.value.trim()) {
      emailError.value = 'Email is required'
    } else if (!isValidEmailFormat(email.value)) {
      emailError.value = 'Enter a valid email address'
    } else {
      emailError.value = null
    }

    return !emailError.value
  }

  function validateConfirmEmail() {
    if (!isRegisterMode.value) {
      confirmEmailError.value = null
      return true
    }

    if (!shouldValidateField(confirmEmailTouched.value)) {
      confirmEmailError.value = null
      return true
    }

    if (!confirmEmail.value.trim()) {
      confirmEmailError.value = 'Please confirm your email'
    } else if (normalizeEmail(email.value) !== normalizeEmail(confirmEmail.value)) {
      confirmEmailError.value = 'Email addresses do not match'
    } else {
      confirmEmailError.value = null
    }

    return !confirmEmailError.value
  }

  function validatePassword() {
    if (!shouldValidateField(passwordTouched.value)) {
      passwordError.value = null
      return true
    }

    if (!password.value) {
      passwordError.value = 'Password is required'
    } else if (isRegisterMode.value && password.value.length < 6) {
      passwordError.value = 'Password must be at least 6 characters'
    } else {
      passwordError.value = null
    }

    return !passwordError.value
  }

  function validateConfirmPassword() {
    if (!isRegisterMode.value) {
      confirmPasswordError.value = null
      return true
    }

    if (!shouldValidateField(confirmPasswordTouched.value)) {
      confirmPasswordError.value = null
      return true
    }

    if (!confirmPassword.value) {
      confirmPasswordError.value = 'Please confirm your password'
    } else if (password.value !== confirmPassword.value) {
      confirmPasswordError.value = 'Passwords do not match'
    } else {
      confirmPasswordError.value = null
    }

    return !confirmPasswordError.value
  }

  function validateConsent() {
    if (!isRegisterMode.value) {
      consentError.value = null
      return true
    }

    if (!shouldValidateField(consentTouched.value)) {
      consentError.value = null
      return true
    }

    if (!consentAccepted.value) {
      consentError.value = 'You must accept the research consent before registering'
    } else {
      consentError.value = null
    }

    return !consentError.value
  }

  function validate() {
    hasSubmitted.value = true

    return validateNickname()
      && validateEmail()
      && validateConfirmEmail()
      && validatePassword()
      && validateConfirmPassword()
      && validateConsent()
  }

  function switchMode(nextMode: AuthMode) {
    if (isLoading.value || mode.value === nextMode) return

    mode.value = nextMode
    resetValues()
    resetInteractionState()
    clearErrors()
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

  async function submit() {
    if (!validate()) return null

    isLoading.value = true

    try {
      if (mode.value === 'login') {
        await auth.login(email.value, password.value)
      } else {
        await auth.register(email.value, password.value, nickname.value)
      }

      return mode.value
    } catch (error: any) {
      applySubmitError(error?.message ?? 'Authentication failed')
      return null
    } finally {
      isLoading.value = false
    }
  }

  watch([nickname, email, confirmEmail, password, confirmPassword, consentAccepted, mode], () => {
    formError.value = null
    validateNickname()
    validateEmail()
    validateConfirmEmail()
    validatePassword()
    validateConfirmPassword()
    validateConsent()
  })

  return {
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
  }
}
