<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'
import AuthForm from '@/features/auth/components/AuthForm.vue'

type DockPanel = 'guide' | 'profile' | null

const auth = useAuth()
const openPanel = ref<DockPanel>(null)
const isHydrating = ref(false)
const error = ref<string | null>(null)
const isLoggingOut = ref(false)
const isAuthenticated = computed(() => auth.isAuthenticated.value)
const currentUser = computed(() => auth.user.value)
const isOpen = computed(() => openPanel.value !== null)
const isGuideOpen = computed(() => openPanel.value === 'guide')
const isProfileOpen = computed(() => openPanel.value === 'profile')

const photogrammetryGuide = [
  {
    title: 'Pick a subject you can fully walk around',
    points: [
      'Choose an object that is small or accessible enough to capture from all sides.',
      'Keep the subject as the main focus and leave as little unnecessary background as possible.',
    ],
  },
  {
    title: 'Capture a dense, overlapping dataset',
    points: [
      'Move gradually around the subject and keep strong overlap between consecutive shots.',
      'Take at least 50 photos, or record one or more videos from different angles.',
      'More coverage usually means a cleaner final model with fewer gaps.',
    ],
  },
  {
    title: 'Keep the footage clean and consistent',
    points: [
      'Use sharp, well-lit images whenever possible.',
      'Avoid motion blur, heavy shadows, strong reflections, and sudden lighting changes.',
    ],
  },
  {
    title: 'Review the set before upload',
    points: [
      'Check that the object stays visible across the full sequence instead of disappearing behind background clutter.',
      'Remove the weakest photos if they are badly blurred, very dark, or off-angle compared with the rest of the set.',
      'If the first reconstruction looks incomplete, capture more viewpoints and try again with a richer dataset.',
    ],
  },
] as const

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
  openPanel.value = isProfileOpen.value ? null : 'profile'
  error.value = null
}

function toggleGuide() {
  openPanel.value = isGuideOpen.value ? null : 'guide'
  error.value = null
}

function closePanel() {
  openPanel.value = null
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
    <div class="profile-dock-actions">
      <button
        type="button"
        class="profile-dock-trigger profile-dock-trigger--guide"
        :aria-expanded="isGuideOpen"
        aria-label="Open photogrammetry guide"
        @click="toggleGuide"
      >
        <svg class="profile-dock-trigger-icon profile-dock-trigger-icon--guide" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 17.25a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm-.02-11.5c-2.41 0-4.23 1.47-4.23 3.5a.75.75 0 0 0 1.5 0c0-1.13 1.09-2 2.73-2 1.54 0 2.52.79 2.52 1.86 0 .76-.38 1.23-1.64 2.04-1.38.88-2.06 1.72-2.06 3.1v.25a.75.75 0 0 0 1.5 0v-.25c0-.73.29-1.13 1.37-1.82 1.34-.86 2.33-1.66 2.33-3.32 0-1.95-1.72-3.36-4.02-3.36Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <button
        type="button"
        class="profile-dock-trigger"
        :aria-expanded="isProfileOpen"
        aria-label="Toggle profile panel"
        @click="toggleOpen"
      >
        <span v-if="triggerInitial" class="profile-dock-trigger-label">{{ triggerInitial }}</span>
        <svg v-else class="profile-dock-trigger-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 12.25a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12.25Zm0 1.5c-4.15 0-7.5 2.37-7.5 5.29a.75.75 0 0 0 1.5 0c0-1.87 2.57-3.79 6-3.79s6 1.92 6 3.79a.75.75 0 0 0 1.5 0c0-2.92-3.35-5.29-7.5-5.29Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>

    <button
      v-if="isOpen"
      type="button"
      class="profile-dock-backdrop"
      :aria-label="isGuideOpen ? 'Close photogrammetry guide' : 'Close profile panel'"
      @click="closePanel"
    ></button>

    <section
      v-if="isOpen"
      class="profile-dock-panel"
      :aria-label="isGuideOpen ? 'Photogrammetry guide' : 'User profile panel'"
    >
      <div v-if="isGuideOpen" class="photogrammetry-guide">
        <div class="photogrammetry-guide-header">
          <p class="profile-summary-eyebrow">Guide</p>
          <h2 class="photogrammetry-guide-title">Photogrammetry capture tips</h2>
          <p class="text-muted photogrammetry-guide-copy">
            Use this quick checklist before you upload a new reconstruction dataset.
          </p>
        </div>

        <div class="photogrammetry-guide-sections">
          <article
            v-for="section in photogrammetryGuide"
            :key="section.title"
            class="photogrammetry-guide-section"
          >
            <h3 class="photogrammetry-guide-section-title">{{ section.title }}</h3>
            <ul class="photogrammetry-guide-list">
              <li v-for="point in section.points" :key="point">{{ point }}</li>
            </ul>
          </article>
        </div>

        <div class="photogrammetry-guide-note">
          <p class="photogrammetry-guide-note-title">Good to know</p>
          <p class="photogrammetry-guide-note-copy">
            Videos are often easier to capture than individual photos, and the platform will extract frames
            automatically. Poor datasets usually fail because they include too much background, too few viewpoints, or
            incomplete coverage around the subject.
          </p>
        </div>
      </div>

      <div v-else-if="isHydrating && !currentUser" class="text-muted">Checking session...</div>

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
