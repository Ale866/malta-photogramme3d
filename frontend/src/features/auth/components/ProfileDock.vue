<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'
import AuthForm from '@/features/auth/components/AuthForm.vue'

const auth = useAuth()
const isOpen = ref(false)
const isHydrating = ref(false)
const error = ref<string | null>(null)
const isLoggingOut = ref(false)
const isAuthenticated = computed(() => auth.isAuthenticated.value)
const currentUser = computed(() => auth.user.value)

const triggerInitial = computed(() => {
  if (!isAuthenticated.value) return null

  const nicknameInitial = currentUser.value?.nickname?.trim().charAt(0)
  if (nicknameInitial) return nicknameInitial.toUpperCase()

  const emailInitial = currentUser.value?.email?.trim().charAt(0)
  if (emailInitial) return emailInitial.toUpperCase()
})

const createdAtLabel = computed(() => {
  const createdAt = currentUser.value?.createdAt
  if (!createdAt) return 'Unknown'

  const parsed = Date.parse(createdAt)
  if (Number.isNaN(parsed)) return createdAt

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
})

onMounted(async () => {
  isHydrating.value = true
  try {
    await auth.hydrateSession()
  } finally {
    isHydrating.value = false
  }
})

function toggleOpen() {
  isOpen.value = !isOpen.value
  error.value = null
}

function closePanel() {
  isOpen.value = false
  error.value = null
}

function onAuthSuccess() {
  error.value = null
}

async function onLogout() {
  error.value = null
  isLoggingOut.value = true

  try {
    await auth.logout()
  } catch (e: any) {
    error.value = e?.message ?? 'Logout failed'
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="profile-dock">
    <button type="button" class="profile-dock-trigger" :aria-expanded="isOpen" aria-label="Toggle profile panel"
      @click="toggleOpen">
      <span v-if="triggerInitial" class="profile-dock-trigger-label">{{ triggerInitial }}</span>
      <svg v-else class="profile-dock-trigger-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 12.25a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12.25Zm0 1.5c-4.15 0-7.5 2.37-7.5 5.29a.75.75 0 0 0 1.5 0c0-1.87 2.57-3.79 6-3.79s6 1.92 6 3.79a.75.75 0 0 0 1.5 0c0-2.92-3.35-5.29-7.5-5.29Z"
          fill="currentColor"
        />
      </svg>
    </button>

    <button
      v-if="isOpen"
      type="button"
      class="profile-dock-backdrop"
      aria-label="Close profile panel"
      @click="closePanel"
    ></button>

    <section v-if="isOpen" class="profile-dock-panel" aria-label="User profile panel">
      <div v-if="isHydrating && !currentUser" class="text-muted">Checking session...</div>

      <div v-else-if="isAuthenticated" class="profile-summary">
        <div class="profile-summary-header">
          <p class="profile-summary-eyebrow">Profile</p>
          <h2 class="profile-summary-name">{{ currentUser?.nickname }}</h2>
          <p class="text-muted profile-summary-email">{{ currentUser?.email }}</p>
        </div>

        <dl class="profile-summary-meta">
          <div>
            <dt>Nickname</dt>
            <dd>{{ currentUser?.nickname }}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{{ currentUser?.email }}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{{ createdAtLabel }}</dd>
          </div>
        </dl>

        <p v-if="error" class="text-error">{{ error }}</p>

        <button class="btn btn-primary btn-block" type="button" :disabled="isLoggingOut" @click="onLogout">
          {{ isLoggingOut ? 'Logging out...' : 'Logout' }}
        </button>
      </div>

      <auth-form v-else login-title="Login" register-title="Create account"
        login-subtitle="Login to manage your profile and upload models."
        register-subtitle="Create an account to upload models and manage your profile." @success="onAuthSuccess" />
    </section>
  </div>
</template>
