<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const auth = useAuth()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const isLoading = ref(false)

async function onSubmit() {
  error.value = null
  isLoading.value = true
  try {
    await auth.login(email.value, password.value)
    emit('success')
  } catch (e: any) {
    error.value = e?.message ?? 'Login failed'
  } finally {
    isLoading.value = false
  }
}

function onClose() {
  if (isLoading.value) return
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="auth-modal-overlay" @click.self="onClose">
      <section class="auth-modal" role="dialog" aria-modal="true" aria-label="Login required">
        <header class="auth-modal-header">
          <h2 class="auth-modal-title">Login Required</h2>
          <button type="button" class="btn btn-icon auth-modal-close" @click="onClose">X</button>
        </header>
        <p class="text-muted auth-modal-subtitle">Please login to add a model.</p>

        <form class="form-grid" @submit.prevent="onSubmit">
          <label class="form-field">
            <span class="form-label">Email</span>
            <input v-model="email" class="form-input" type="email" autocomplete="email" required />
          </label>

          <label class="form-field">
            <span class="form-label">Password</span>
            <input v-model="password" class="form-input" type="password" autocomplete="current-password" required />
          </label>

          <p v-if="error" class="text-error">{{ error }}</p>

          <button class="btn btn-primary btn-block" type="submit" :disabled="isLoading">
            {{ isLoading ? 'Logging in...' : 'Login' }}
          </button>
        </form>
      </section>
    </div>
  </Teleport>
</template>
