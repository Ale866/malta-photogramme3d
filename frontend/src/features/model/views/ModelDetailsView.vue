<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
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
  modelRerunError,
  orientationError,
  isLoading,
  isRetrying,
  isModelRerunning,
  isSavingOrientation,
  applyVoteState,
  setError,
  goBack,
  openGeneratedModel,
  openCurrentModelOnIsland,
  retryCurrentJob,
  rerunCurrentModel,
  saveCurrentModelOrientation,
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

const orientationDraft = ref({ x: 0, y: 0, z: 0 })
const orientationDragMode = ref<'orbit' | 'roll'>('orbit')

const showModelRerunPanel = computed(() => {
  const model = modelDetails.value
  if (!model) return false

  return detailSource.value === 'list'
    && detailMode.value === 'model'
    && Boolean(model.sourceJobId)
})

const canEditOrientation = computed(() =>
  detailSource.value === 'list'
  && detailMode.value === 'model'
  && Boolean(modelDetails.value)
)

const previewOrientation = computed(() => {
  if (canEditOrientation.value) return orientationDraft.value
  return modelDetails.value?.orientation ?? { x: 0, y: 0, z: 0 }
})

const hasOrientationChanges = computed(() => {
  const model = modelDetails.value
  if (!model) return false

  return !(
    Math.abs(orientationDraft.value.x - model.orientation.x) < 1e-6
    && Math.abs(orientationDraft.value.y - model.orientation.y) < 1e-6
    && Math.abs(orientationDraft.value.z - model.orientation.z) < 1e-6
  )
})

watch(
  () => modelDetails.value,
  (model) => {
    if (!model) return
    orientationDraft.value = { ...model.orientation }
  },
  { immediate: true }
)

function handlePreviewOrientationChange(orientation: { x: number; y: number; z: number }) {
  if (!canEditOrientation.value) return
  orientationDraft.value = { ...orientation }
}

function resetOrientation() {
  const model = modelDetails.value
  if (!model) return
  orientationDraft.value = { ...model.orientation }
  orientationDragMode.value = 'orbit'
}

async function saveOrientation() {
  await saveCurrentModelOrientation(orientationDraft.value)
}
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
                :orientation="previewOrientation"
                :show-overlay="false"
                :drag-mode="orientationDragMode"
                loading-label="Loading 3D model"
                @orientation-change="handlePreviewOrientationChange"
              />
            </div>

            <div class="model-viewer-toolbar">
              <div class="model-viewer-toolbar-copy">
                <p class="model-viewer-toolbar-eyebrow">
                  {{ canEditOrientation ? 'Set model position' : 'Preview' }}
                </p>
                <p class="model-viewer-toolbar-text">
                  {{ canEditOrientation
                    ? orientationDragMode === 'roll'
                      ? 'Drag in the preview to rotate the model sideways.'
                      : 'Drag in the preview to turn and tilt the model.'
                    : 'Inspect the generated model here.' }}
                </p>
                <p v-if="canEditOrientation" class="model-viewer-toolbar-hint">
                  On mobile, use the sideways mode for the third axis. On desktop, you can also hold Shift while dragging.
                </p>
              </div>

              <div v-if="canEditOrientation" class="model-viewer-toolbar-actions">
                <div class="model-viewer-mode-toggle" role="group" aria-label="Model drag mode">
                  <button
                    class="btn model-viewer-mode-button"
                    :class="{ 'model-viewer-mode-button--active': orientationDragMode === 'orbit' }"
                    type="button"
                    :disabled="isSavingOrientation"
                    @click="orientationDragMode = 'orbit'"
                  >
                    Turn & tilt
                  </button>
                  <button
                    class="btn model-viewer-mode-button"
                    :class="{ 'model-viewer-mode-button--active': orientationDragMode === 'roll' }"
                    type="button"
                    :disabled="isSavingOrientation"
                    @click="orientationDragMode = 'roll'"
                  >
                    Rotate sideways
                  </button>
                </div>
                <div class="model-viewer-toolbar-buttons">
                  <button class="btn model-summary-orientation-reset" type="button" :disabled="isSavingOrientation || !hasOrientationChanges" @click="resetOrientation">
                    Reset
                  </button>
                  <button class="btn btn-primary model-summary-orientation-save" type="button" :disabled="isSavingOrientation || !hasOrientationChanges" @click="saveOrientation">
                    {{ isSavingOrientation ? 'Saving...' : 'Save position' }}
                  </button>
                </div>
              </div>
            </div>

            <p v-if="orientationError" class="text-error model-viewer-toolbar-error">{{ orientationError }}</p>
          </section>

          <aside class="model-summary-panel">
            <p class="model-summary-eyebrow">Created Model</p>
            <h1 class="model-summary-title">{{ modelDetails.title }}</h1>
            <p class="model-summary-copy">
              A finished model ready to inspect here.
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

            <div v-if="detailSource === 'catalog' || showVoting" class="model-summary-actions">
              <button class="btn btn-primary model-summary-island-button"
                v-if="detailSource === 'catalog'"
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

        <div v-if="showModelRerunPanel" class="model-details-secondary-row">
          <div class="model-summary-rerun-callout">
            <p class="model-summary-rerun-eyebrow">
              {{ modelDetails.hasBeenRerun ? 'Final model' : 'One rerun with more tolerant settings available' }}
            </p>
            <p class="model-summary-rerun-title">
              {{ modelDetails.hasBeenRerun ? 'This model is already the second attempt' : 'Replace this model with a second attempt' }}
            </p>
            <p class="model-summary-rerun-copy">
              <template v-if="!modelDetails.hasBeenRerun">
                We can rebuild this model once more with more tolerant settings. The current model will be discarded, and the new result will become the final version. This may recover more of the shape, but the new model may look rougher or less accurate.
              </template>
              <template v-else>
                This model cannot be rerun again here. If you want a better result, the best next step is to capture a new photo or video set with better coverage and clarity.
              </template>
            </p>
            <p v-if="modelRerunError" class="text-error model-summary-rerun-error">{{ modelRerunError }}</p>
            <div v-if="!modelDetails.hasBeenRerun" class="model-summary-rerun-actions">
              <button class="btn model-summary-rerun-button" type="button" :disabled="isModelRerunning" @click="rerunCurrentModel">
                {{ isModelRerunning ? 'Starting new attempt...' : 'Rebuild' }}
              </button>
            </div>
          </div>
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
