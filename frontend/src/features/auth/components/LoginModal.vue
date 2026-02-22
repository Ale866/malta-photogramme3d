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
    <div v-if="props.open" class="overlay" @click.self="onClose">
      <section class="modal" role="dialog" aria-modal="true" aria-label="Login required">
        <header class="header">
          <h2>Login Required</h2>
          <button type="button" class="close" @click="onClose">X</button>
        </header>
        <p class="subtitle">Please login to add a model.</p>

        <form class="form" @submit.prevent="onSubmit">
          <label class="field">
            <span>Email</span>
            <input v-model="email" type="email" autocomplete="email" required />
          </label>

          <label class="field">
            <span>Password</span>
            <input v-model="password" type="password" autocomplete="current-password" required />
          </label>

          <p v-if="error" class="error">{{ error }}</p>

          <button class="submit" type="submit" :disabled="isLoading">
            {{ isLoading ? 'Logging in...' : 'Login' }}
          </button>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.56);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal {
  width: min(420px, 100%);
  background: #1d1d1d;
  color: #fff;
  border: 1px solid #3f3f3f;
  border-radius: 12px;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.close {
  border: 1px solid #555;
  background: #2b2b2b;
  color: #fff;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
}

.subtitle {
  margin: 0.45rem 0 0.9rem;
  color: #c7c7c7;
}

.form {
  display: grid;
  gap: 0.75rem;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field input {
  padding: 0.55rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #5e5e5e;
  background: #262626;
  color: #fff;
}

.error {
  margin: 0;
  color: #ff8080;
}

.submit {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 0;
  border-radius: 6px;
  color: #fff;
  background: #0d79ff;
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
