<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { usePlaceLabel } from '@/core/application/usePlaceLabel'
import { useAuth } from '@/features/auth/application/useAuth'
import { useModelDetailVoting } from '@/features/model/application/useModelDetailVoting'
import ModelJobDetailsPage from '@/features/model/components/ModelJobDetailsPage.vue'
import { useModelDetails } from '@/features/model/application/useModelDetails'
import { MIN_ISLAND_MODEL_VOTES, canRenderModelOnIsland } from '@/features/model/domain/ModelSummary'

const ModelPreviewViewport = defineAsyncComponent(() => import('@/features/model/components/ModelPreviewViewport.vue'))

const {
  detailMode,
  detailSource,
  modelDetails,
  liveJobDetails,
  trackingError,
  errorMessage,
  retryError,
  isLoading,
  isRetrying,
  applyVoteState,
  setError,
  goBack,
  openGeneratedModel,
  openCurrentModelOnIsland,
  retryCurrentJob,
} = useModelDetails()

const auth = useAuth()

function formatDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

const backLabel = computed(() => detailSource.value === 'catalog' ? 'Back to catalog' : 'Back to my models')
const { placeLabel: modelLocationLabel } = usePlaceLabel(() => modelDetails.value?.coordinates)
const {
  showVoting,
  isVoteDisabled,
  toggleVote,
} = useModelDetailVoting({
  detailSource,
  modelDetails,
  applyVoteState,
  setErrorMessage: setError,
})

const ownerName = computed(() => {
  const model = modelDetails.value
  if (!model) return 'Unknown creator'

  if (model.ownerNickname?.trim()) return model.ownerNickname
  if (auth.user.value?.id === model.ownerId && auth.user.value.nickname.trim()) return auth.user.value.nickname
  return 'Unknown creator'
})

const modelMeta = computed(() => {
  const model = modelDetails.value
  if (!model) return []

  return [
    { key: 'creator', label: 'Creator', value: ownerName.value },
    { key: 'created', label: 'Created', value: formatDate(model.createdAt) },
    { key: 'location', label: 'Location', value: modelLocationLabel.value },
  ]
})

const isIslandButtonDisabled = computed(() => {
  const model = modelDetails.value
  return !model || !canRenderModelOnIsland(model.voteCount)
})

const islandButtonTitle = computed(() => {
  const model = modelDetails.value
  if (!model || canRenderModelOnIsland(model.voteCount)) return undefined

  return `Needs at least ${MIN_ISLAND_MODEL_VOTES} votes to appear on the island`
})
</script>

<template>
  <section class="model-details-page">
    <div class="model-details-backdrop"></div>

    <div class="model-details-shell">
      <header class="model-details-topbar">
        <button class="btn model-details-back-button" type="button" @click="goBack">
          {{ backLabel }}
        </button>
      </header>

      <div v-if="errorMessage" class="model-details-state-card">
        <p class="model-details-state-eyebrow">Unable to load details</p>
        <p class="text-error">{{ errorMessage }}</p>
      </div>

      <div v-else-if="isLoading" class="model-details-state-card">
        <p class="model-details-state-eyebrow">Loading details</p>
        <p class="text-muted">Preparing the model view and its details...</p>
      </div>

      <template v-else-if="detailMode === 'model' && modelDetails">
        <div class="model-details-layout">
          <section class="model-viewer-panel">
            <div class="model-viewer-stage">
              <model-preview-viewport
                :key="modelDetails.id"
                :mesh-url="modelDetails.meshAssetUrl"
                :texture-url="modelDetails.textureAssetUrl"
              />
            </div>
          </section>

          <aside class="model-summary-panel">
            <p class="model-summary-eyebrow">Created Model</p>
            <h1 class="model-summary-title">{{ modelDetails.title }}</h1>
            <p class="model-summary-copy">
              A finished model ready to inspect here and place on the island.
            </p>

            <dl class="model-summary-details">
              <div v-for="item in modelMeta" :key="item.key" class="model-summary-detail">
                <dt class="model-summary-detail-label">
                  <span class="model-summary-detail-icon" aria-hidden="true">
                    <svg v-if="item.key === 'location'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
                      <circle cx="12" cy="11" r="2.2" />
                    </svg>
                    <svg v-else-if="item.key === 'created'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M8 3v3" />
                      <path d="M16 3v3" />
                      <path d="M4 9h16" />
                      <rect x="4" y="5" width="16" height="16" rx="2" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
                    </svg>
                  </span>
                  <span>{{ item.label }}</span>
                </dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>

            <div class="model-summary-actions">
              <button class="btn btn-primary model-summary-island-button"
                :class="{ 'model-summary-island-button--solo': !showVoting }" type="button"
                :disabled="isIslandButtonDisabled" :title="islandButtonTitle" @click="openCurrentModelOnIsland">
                View on island
              </button>

              <button
                v-if="showVoting"
                class="btn model-summary-vote-button"
                :class="{ 'model-summary-vote-button--active': modelDetails.hasVoted }"
                type="button"
                :disabled="isVoteDisabled"
                @click="toggleVote"
              >
                <svg
                  viewBox="0 0 24 24"
                  :fill="modelDetails.hasVoted ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  :stroke-width="modelDetails.hasVoted ? 0 : 1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 4.5 20 14h-5v6H9v-6H4z" />
                </svg>
                <span class="model-summary-vote-count">{{ modelDetails.voteCount }}</span>
              </button>
            </div>
          </aside>
        </div>
      </template>

      <template v-else-if="liveJobDetails">
        <model-job-details-page :job="liveJobDetails" :tracking-error="trackingError"
          :retry-error="retryError" :is-retrying="isRetrying" :can-open-generated-model="Boolean(liveJobDetails.modelId)"
          @open-generated-model="openGeneratedModel" @retry-job="retryCurrentJob" />
      </template>
    </div>
  </section>
</template>
