<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import AuthForm from '@/features/auth/components/AuthForm.vue'

const route = useRoute()
const router = useRouter()

async function onSuccess() {
  const next = typeof route.query.next === 'string' ? route.query.next : '/'
  await router.replace(next)
}
</script>

<template>
  <div class="auth-page">
    <auth-form
      login-title="Login"
      register-title="Create account"
      login-subtitle="Access your account to continue."
      register-subtitle="Create an account to continue."
      @success="onSuccess"
    />
  </div>
</template>
