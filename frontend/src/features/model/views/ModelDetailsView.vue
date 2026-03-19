<script setup lang="ts">
import ModelJobStatusPanel from '@/features/model/components/ModelJobStatusPanel.vue'
import { useModelDetails } from '@/features/model/application/useModelDetails'

const {
  detailMode,
  modelDetails,
  liveJobDetails,
  detailTitle,
  detailSubtitle,
  canOpenGeneratedModel,
  trackingError,
  errorMessage,
  isLoading,
  goBack,
  openGeneratedModel,
  openGeneratedModelOnIsland,
  formatCoordinates,
  formatDate,
  formatOptionalDate,
} = useModelDetails()
</script>

<template>
  <section class="model-details-page">
    <button class="btn" type="button" @click="goBack">
      Back to list
    </button>

    <h1>{{ detailTitle }}</h1>
    <p v-if="detailSubtitle" class="text-muted">{{ detailSubtitle }}</p>

    <p v-if="errorMessage" class="text-error">{{ errorMessage }}</p>
    <div v-else-if="isLoading" class="text-muted">Loading details...</div>

    <template v-else-if="detailMode === 'job' && liveJobDetails">
      <model-job-status-panel
        :job="liveJobDetails"
        title="Pipeline progress"
        subtitle="This updates automatically while the reconstruction is running."
      />

      <p v-if="trackingError" class="text-error">{{ trackingError }}</p>

      <div class="model-details-simple-actions" v-if="canOpenGeneratedModel">
        <button class="btn btn-primary" type="button" @click="openGeneratedModel">
          Open generated model
        </button>
        <button class="btn" type="button" @click="openGeneratedModelOnIsland">
          View on island
        </button>
      </div>

      <dl class="model-details-simple-meta">
        <div>
          <dt>Job ID</dt>
          <dd>{{ liveJobDetails.jobId }}</dd>
        </div>
        <div>
          <dt>Images</dt>
          <dd>{{ liveJobDetails.imageCount }}</dd>
        </div>
        <div>
          <dt>Coordinates</dt>
          <dd>{{ formatCoordinates(liveJobDetails.coordinates) }}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{{ formatDate(liveJobDetails.createdAt) }}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{{ formatDate(liveJobDetails.updatedAt) }}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{{ formatOptionalDate(liveJobDetails.startedAt) }}</dd>
        </div>
        <div>
          <dt>Finished</dt>
          <dd>{{ formatOptionalDate(liveJobDetails.finishedAt) }}</dd>
        </div>
      </dl>
    </template>

    <template v-else-if="modelDetails">
      <p><strong>Model ID:</strong> {{ modelDetails.id }}</p>
      <p><strong>Coordinates:</strong> {{ formatCoordinates(modelDetails.coordinates) }}</p>
      <p><strong>Created:</strong> {{ formatDate(modelDetails.createdAt) }}</p>
      <p><strong>Source job:</strong> {{ modelDetails.sourceJobId ?? 'Not available' }}</p>
      <p><strong>Output folder:</strong> {{ modelDetails.outputFolder }}</p>
    </template>
  </section>
</template>
