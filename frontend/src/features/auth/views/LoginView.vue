<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/features/auth/application/useAuth'

const route = useRoute()
const router = useRouter()
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

    const next = typeof route.query.next === 'string' ? route.query.next : '/'
    await router.replace(next)
  } catch (e: any) {
    error.value = e?.message ?? 'Login failed'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <h2 class="login-page-title">Login</h2>

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
  </div>
</template>
