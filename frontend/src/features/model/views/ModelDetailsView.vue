<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'
import { useModelDetails } from '@/features/model/application/useModelDetails'

const {
  detailMode,
  detailSource,
  modelDetails,
  liveJobDetails,
  trackingError,
  errorMessage,
  isLoading,
  goBack,
  openGeneratedModel,
  openGeneratedModelOnIsland,
  openCurrentModelOnIsland,
} = useModelDetails()

const auth = useAuth()

const coordinateFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 3,
})

function formatCoordinates(coordinates: { x: number; y: number; z: number } | null | undefined) {
  if (!coordinates) return 'Not available'
  return `${coordinateFormatter.format(coordinates.x)}, ${coordinateFormatter.format(coordinates.y)}, ${coordinateFormatter.format(coordinates.z)}`
}

function formatDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function formatStageLabel(stage: string | null | undefined) {
  if (!stage) return 'Awaiting update'
  return stage
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (segment) => segment.toUpperCase())
}

const backLabel = computed(() => detailSource.value === 'catalog' ? 'Back to catalog' : 'Back to my models')

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
    { label: 'Creator', value: ownerName.value },
    { label: 'Published', value: formatDate(model.createdAt) },
    { label: 'Coordinates', value: formatCoordinates(model.coordinates) },
  ]
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
              
            </div>
          </section>

          <aside class="model-summary-panel">
            <p class="model-summary-eyebrow">Published Model</p>
            <h1 class="model-summary-title">{{ modelDetails.title }}</h1>
            <p class="model-summary-copy">
              A finished model ready to inspect here and place on the island.
            </p>

            <div class="model-summary-actions">
              <button class="btn btn-primary" type="button" @click="openCurrentModelOnIsland">
                View on island
              </button>
            </div>

            <dl class="model-summary-facts">
              <div v-for="item in modelMeta" :key="item.label" class="model-summary-fact">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </template>

      <template v-else-if="liveJobDetails">
        <section class="model-details-state-card">
          <p class="model-details-state-eyebrow">Model Job</p>
          <h1 class="model-job-fallback-title">{{ liveJobDetails.title }}</h1>
          <p class="text-muted">Job details will be refined in the next pass.</p>
          <p class="model-job-fallback-status">
            Status: {{ formatStageLabel(liveJobDetails.status) }} - {{ liveJobDetails.progress }}%
          </p>
          <p class="text-muted">{{ formatStageLabel(liveJobDetails.stage) }}</p>

          <div class="model-summary-actions" v-if="liveJobDetails.modelId">
            <button class="btn btn-primary" type="button" @click="openGeneratedModel">
              Open generated model
            </button>
            <button class="btn" type="button" @click="openGeneratedModelOnIsland">
              View on island
            </button>
          </div>

          <p v-if="trackingError" class="text-error model-details-inline-error">
            {{ trackingError }}
          </p>
        </section>
      </template>
    </div>
  </section>
</template>
