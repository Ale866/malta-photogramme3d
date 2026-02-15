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
    <h2 class="title">Login</h2>

    <form class="form" @submit.prevent="onSubmit">
      <label class="field">
        <span class="label">Email</span>
        <input v-model="email" class="input" type="email" autocomplete="email" required />
      </label>

      <label class="field">
        <span class="label">Password</span>
        <input v-model="password" class="input" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="button" type="submit" :disabled="isLoading">
        {{ isLoading ? 'Logging in...' : 'Login' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  max-width: 420px;
  margin: 64px auto;
  padding: 16px;
}

.title {
  margin-bottom: 12px;
}

.form {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 14px;
}

.input {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  outline: none;
}

.input:focus {
  border-color: #666;
}

.error {
  color: #c00;
  margin: 0;
}

.button {
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>