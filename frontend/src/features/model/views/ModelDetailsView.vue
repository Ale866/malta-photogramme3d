<script setup lang="ts">
import { computed } from 'vue'
import { usePlaceLabel } from '@/core/application/usePlaceLabel'
import { useAuth } from '@/features/auth/application/useAuth'
import ModelJobDetailsPage from '@/features/model/components/ModelJobDetailsPage.vue'
import ModelPreviewViewport from '@/features/model/components/ModelPreviewViewport.vue'
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
  openCurrentModelOnIsland,
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
    { label: 'Location', value: modelLocationLabel.value },
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
              <model-preview-viewport />
            </div>
          </section>

          <aside class="model-summary-panel">
            <p class="model-summary-eyebrow">Published Model</p>
            <h1 class="model-summary-title">{{ modelDetails.title }}</h1>
            <p class="model-summary-copy">
              A finished model ready to inspect here and place on the island.
            </p>

            <div class="model-summary-actions">
              <button class="btn btn-primary model-summary-island-button" type="button" @click="openCurrentModelOnIsland">
                View on island
              </button>
            </div>

            <dl class="model-summary-details">
              <div v-for="item in modelMeta" :key="item.label" class="model-summary-detail">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </template>

      <template v-else-if="liveJobDetails">
        <model-job-details-page
          :job="liveJobDetails"
          :tracking-error="trackingError"
          :can-open-generated-model="Boolean(liveJobDetails.modelId)"
          @open-generated-model="openGeneratedModel"
        />
      </template>
    </div>
  </section>
</template>
