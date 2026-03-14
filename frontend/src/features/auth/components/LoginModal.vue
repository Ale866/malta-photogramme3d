<script setup lang="ts">
import AuthForm from '@/features/auth/components/AuthForm.vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

function onSuccess() {
  emit('success')
}

function onClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="auth-modal-overlay" @click.self="onClose">
      <section class="auth-modal" role="dialog" aria-modal="true" aria-label="Authentication required">
        <button type="button" class="btn btn-icon auth-modal-close auth-modal-close--floating"
          @click="onClose">X</button>
        <auth-form login-title="Login required" register-title="Create account"
          login-subtitle="Please login to add a model." register-subtitle="Create an account to add a model."
          @success="onSuccess" />
      </section>
    </div>
  </Teleport>
</template>
