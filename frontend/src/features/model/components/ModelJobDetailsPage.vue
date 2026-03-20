<script setup lang="ts">
import { computed } from 'vue'
import type { ModelJobDetails } from '@/features/model/domain/ModelJobDetails'

const props = defineProps<{
  job: ModelJobDetails
  trackingError: string | null
  canOpenGeneratedModel: boolean
}>()

const emit = defineEmits<{
  (event: 'open-generated-model'): void
}>()

const openGeneratedModel = () => {
  emit('open-generated-model')
}

const coordinateFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 3,
})

function formatCoordinates(coordinates: { x: number; y: number; z: number } | null | undefined) {
  if (!coordinates) return 'Not available'
  return `${coordinateFormatter.format(coordinates.x)}, ${coordinateFormatter.format(coordinates.y)}, ${coordinateFormatter.format(coordinates.z)}`
}

function formatDate(value: string | undefined) {
  if (!value) return 'Not available'

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function formatLabel(value: string | undefined) {
  if (!value) return 'Awaiting update'

  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (segment) => segment.toUpperCase())
}

function clampProgress(progress: number) {
  if (Number.isNaN(progress)) return 0
  return Math.max(0, Math.min(100, Math.round(progress)))
}

const progressValue = computed(() => clampProgress(props.job.progress))
const stageLabel = computed(() => formatLabel(props.job.stage))

const summary = computed(() => {
  switch (props.job.status) {
    case 'queued':
      return 'The reconstruction is queued and waiting to start.'
    case 'running':
      return 'The reconstruction is in progress. Updates on this page arrive live from the job tracker.'
    case 'failed':
      return 'The reconstruction stopped before completion. The latest job state is shown below.'
    case 'succeeded':
      return 'The reconstruction finished successfully. The generated model is ready.'
  }
})

const details = computed(() => [
  { label: 'Images', value: String(props.job.imageCount) },
  { label: 'Coordinates', value: formatCoordinates(props.job.coordinates) },
  { label: 'Created', value: formatDate(props.job.createdAt) },
])
</script>

<template>
  <div class="model-job-details-layout">
    <section class="model-job-progress-card">
      <p class="model-job-eyebrow">Reconstruction Job</p>

      <h1 class="model-job-title">{{ job.title }}</h1>

      <p class="model-job-summary">{{ summary }}</p>

      <div class="model-job-stage-row">
        <div>
          <p class="model-job-stage-label">Current stage</p>
          <p class="model-job-stage-value">{{ stageLabel }}</p>
        </div>
        <p class="model-job-progress-value">{{ progressValue }}%</p>
      </div>

      <div class="model-job-progress-bar" aria-hidden="true">
        <span :style="{ width: `${progressValue}%` }"></span>
      </div>

      <p class="model-job-progress-note">Live updates arrive automatically while this page is open.</p>

      <p v-if="job.error" class="text-error model-job-error">{{ job.error }}</p>
      <p v-else-if="trackingError" class="text-error model-job-error">{{ trackingError }}</p>

      <dl class="model-job-details-grid">
        <div v-for="detail in details" :key="detail.label" class="model-job-detail-card">
          <dt>{{ detail.label }}</dt>
          <dd>{{ detail.value }}</dd>
        </div>
      </dl>

      <div class="model-job-actions">
        <button class="btn btn-primary model-job-action-button" type="button" :disabled="!canOpenGeneratedModel"
          @click="openGeneratedModel">
          Open generated model
        </button>
      </div>
    </section>
  </div>
</template>
