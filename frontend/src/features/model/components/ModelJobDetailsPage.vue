<script setup lang="ts">
import { computed } from 'vue'
import { usePlaceLabel } from '@/core/application/usePlaceLabel'
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
const { placeLabel } = usePlaceLabel(() => props.job.coordinates!)

const summary = computed(() => {
  switch (props.job.status) {
    case 'queued':
      return 'The reconstruction is queued and waiting to start.'
    case 'running':
      return 'The reconstruction is in progress.'
    case 'failed':
      return 'The reconstruction stopped before completion. The latest job state is shown below.'
    case 'succeeded':
      return 'The reconstruction finished successfully. The generated model is ready.'
  }
})

const progressNote = computed(() => {
  if (props.job.status === 'queued' || props.job.status === 'running') {
    return 'Live updates arrive automatically while this page is open.'
  }

  return null
})

const details = computed(() => [
  { key: 'images', label: 'Images', value: String(props.job.imageCount) },
  { key: 'location', label: 'Location', value: placeLabel.value },
  { key: 'created', label: 'Created', value: formatDate(props.job.createdAt) },
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

      <p v-if="progressNote" class="model-job-progress-note">{{ progressNote }}</p>

      <p v-if="job.error" class="text-error model-job-error">{{ job.error }}</p>
      <p v-else-if="trackingError" class="text-error model-job-error">{{ trackingError }}</p>

      <dl class="model-job-details-grid">
        <div v-for="detail in details" :key="detail.key" class="model-job-detail-card">
          <dt class="model-job-detail-label">
            <span class="model-job-detail-icon" aria-hidden="true">
              <svg v-if="detail.key === 'location'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
                <circle cx="12" cy="11" r="2.2" />
              </svg>
              <svg v-else-if="detail.key === 'created'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3" />
                <path d="M16 3v3" />
                <path d="M4 9h16" />
                <rect x="4" y="5" width="16" height="16" rx="2" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 7h16" />
                <path d="M6 7V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V7" />
                <rect x="4" y="7" width="16" height="12" rx="2" />
                <path d="M10 12h4" />
              </svg>
            </span>
            <span>{{ detail.label }}</span>
          </dt>
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
