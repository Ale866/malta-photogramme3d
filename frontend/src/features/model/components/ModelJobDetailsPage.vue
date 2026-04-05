<script setup lang="ts">
import { computed } from 'vue'
import { usePlaceLabel } from '@/core/application/usePlaceLabel'
import { MODEL_JOB_STATUS, isModelJobPendingStatus } from '@/features/model/domain/ModelJob'
import type { ModelJobDetails } from '@/features/model/domain/ModelJobDetails'

const props = defineProps<{
  job: ModelJobDetails
  trackingError: string | null
  retryError: string | null
  isRetrying: boolean
  canOpenGeneratedModel: boolean
}>()
const emit = defineEmits<{
  (event: 'open-generated-model'): void
  (event: 'retry-job'): void
}>()

const openGeneratedModel = () => {
  emit('open-generated-model')
}

const retryJob = () => {
  emit('retry-job')
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
const stageLabel = computed(() => {
  if (props.job.status === MODEL_JOB_STATUS.COMPLETED) return 'Completed'
  if (props.job.status === MODEL_JOB_STATUS.QUEUED_TO_RERUN) return 'Queued for second attempt'
  return formatLabel(normalizeRoadmapStatus(props.job.stage))
})
const { placeLabel } = usePlaceLabel(() => props.job.coordinates!)
const isFailedState = computed(() => props.job.status === MODEL_JOB_STATUS.FAILED)
const isRetryQueuedState = computed(() => props.job.status === MODEL_JOB_STATUS.QUEUED_TO_RERUN)
const stateToneClass = computed(() => {
  if (isFailedState.value) return 'model-job-main-card--failed'
  if (isRetryQueuedState.value) return 'model-job-main-card--retrying'
  return ''
})
const statusBadge = computed(() => {
  if (isFailedState.value && props.job.hasBeenRerun) return 'Retry used'
  if (isFailedState.value) return 'Needs attention'
  if (isRetryQueuedState.value) return 'Second attempt queued'
  if (props.job.status === MODEL_JOB_STATUS.COMPLETED) return 'Completed'
  if (props.job.status === MODEL_JOB_STATUS.QUEUED) return 'Queued'
  return 'In progress'
})

const summary = computed(() => {
  if (props.job.status === MODEL_JOB_STATUS.QUEUED) {
    return 'The reconstruction is queued and waiting to start.'
  }

  if (props.job.status === MODEL_JOB_STATUS.QUEUED_TO_RERUN) {
    return 'A second attempt is queued using more tolerant settings on the same pictures. This may recover more of the scene, but the final model may look rougher or less accurate than a result built from better pictures.'
  }

  if (props.job.status === MODEL_JOB_STATUS.FAILED) {
    if (props.job.hasBeenRerun) {
      return 'We could not build a complete result from these pictures, even after the second attempt. At this point, the best next step is to take more pictures or clearer ones with better coverage of the object.'
    }

    return 'We could not build a complete result from these pictures. You can try one more time with more tolerant settings, but that is only a fallback. The best way to improve the result is to have a more complete and clearer dataset.'
  }

  if (props.job.status === MODEL_JOB_STATUS.COMPLETED) {
    return 'The reconstruction finished successfully. The generated model is ready.'
  }

  return 'We are building the 3D result from your pictures.'
})

const progressNote = computed(() => {
  if (isModelJobPendingStatus(props.job.status)) {
    return 'Live updates arrive automatically while this page is open.'
  }

  return null
})

const stageRoadmap = [
  { key: MODEL_JOB_STATUS.QUEUED, label: 'Queued' },
  { key: MODEL_JOB_STATUS.FEATURE_EXTRACTION, label: 'Features' },
  { key: MODEL_JOB_STATUS.FEATURE_MATCHING, label: 'Matching' },
  { key: MODEL_JOB_STATUS.SPARSE_MAPPING, label: 'Sparse' },
  { key: MODEL_JOB_STATUS.DENSE_PREPARATION, label: 'Dense prep' },
  { key: MODEL_JOB_STATUS.DENSE_STEREO, label: 'Depth' },
  { key: MODEL_JOB_STATUS.FUSION, label: 'Fusion' },
  { key: MODEL_JOB_STATUS.MESHING, label: 'Mesh' },
  { key: MODEL_JOB_STATUS.TEXTURING, label: 'Texture' },
] as const

const stageStatusOrder = stageRoadmap.map((stage) => stage.key)

function normalizeRoadmapStatus(status: string) {
  const normalized = status.endsWith('_failed') ? status.slice(0, -'_failed'.length) : status
  if (normalized === MODEL_JOB_STATUS.QUEUED_TO_RERUN) return MODEL_JOB_STATUS.QUEUED
  return normalized
}

const currentRoadmapIndex = computed(() => {
  if (props.job.status === MODEL_JOB_STATUS.COMPLETED) {
    return stageStatusOrder.length - 1
  }

  const status = normalizeRoadmapStatus(props.job.status)

  if (status === MODEL_JOB_STATUS.FAILED) {
    const failedStageIndex = stageStatusOrder.indexOf(
      normalizeRoadmapStatus(props.job.stage) as typeof stageStatusOrder[number]
    )
    return failedStageIndex >= 0 ? failedStageIndex : stageStatusOrder.length - 1
  }

  const index = stageStatusOrder.indexOf(status as typeof stageStatusOrder[number])
  if (index >= 0) return index
  return 0
})

const roadmapItems = computed(() =>
  stageRoadmap.map((stage, index) => {
    let state: 'done' | 'current' | 'pending' | 'failed' = 'pending'

    if (props.job.status === MODEL_JOB_STATUS.COMPLETED) {
      state = 'done'
    } else if (isFailedState.value && index === currentRoadmapIndex.value) {
      state = 'failed'
    } else if (index < currentRoadmapIndex.value) {
      state = 'done'
    } else if (index === currentRoadmapIndex.value) {
      state = 'current'
    }

    return {
      ...stage,
      state,
    }
  })
)

const canRetry = computed(() => props.job.status === MODEL_JOB_STATUS.FAILED && !props.job.hasBeenRerun)

const details = computed(() => [
  { key: 'location', label: 'Location', value: placeLabel.value },
  { key: 'created', label: 'Created', value: formatDate(props.job.createdAt) },
])
</script>

<template>
  <div class="model-job-details-layout">
    <section class="model-job-main-card" :class="stateToneClass">
      <div class="model-job-header">
        <div class="model-job-header-copy">
          <p class="model-job-eyebrow">Reconstruction Job</p>
          <h1 class="model-job-title">{{ job.title }}</h1>
        </div>

        <p class="model-job-status-badge">{{ statusBadge }}</p>
      </div>

      <p class="model-job-summary">{{ summary }}</p>

      <div v-if="retryError || job.error || trackingError || canRetry" class="model-job-feedback-stack">
        <div v-if="retryError || job.error || trackingError" class="model-job-error-banner">
          <p class="model-job-error-title">Latest issue</p>
          <p v-if="retryError" class="text-error model-job-error">{{ retryError }}</p>
          <p v-else-if="job.error" class="text-error model-job-error">{{ job.error }}</p>
          <p v-else-if="trackingError" class="text-error model-job-error">{{ trackingError }}</p>
        </div>

        <div v-if="canRetry" class="model-job-retry-callout">
          <div class="model-job-retry-copy-block">
            <p class="model-job-retry-eyebrow">One fallback attempt</p>
            <p class="model-job-retry-title">Try again with the same photos</p>
            <p class="model-job-retry-copy">
              We can make one more attempt using more tolerant settings on the same photos. This may help recover more of the shape, but the final model may be less clean or less accurate. Taking more photos, or taking clearer ones with better coverage of the object, is still the best option.
            </p>
          </div>

          <div class="model-job-retry-actions">
            <button class="btn model-job-retry-button" type="button" :disabled="isRetrying" @click="retryJob">
              {{ isRetrying ? 'Starting second attempt...' : 'Try again anyway' }}
            </button>
          </div>
        </div>
      </div>

      <section class="model-job-status-card">
        <div class="model-job-status-head">
          <div class="model-job-status-copy-block">
            <p class="model-job-status-card-title">Current stage</p>
            <div class="model-job-status-stage-row">
              <p class="model-job-stage-value">{{ stageLabel }}</p>
              <p class="model-job-inline-stat">
                <span class="model-job-inline-stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 7h16" />
                    <path d="M6 7V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V7" />
                    <rect x="4" y="7" width="16" height="12" rx="2" />
                    <path d="M10 12h4" />
                  </svg>
                </span>
                <span>{{ job.imageCount }} images</span>
              </p>
            </div>
          </div>

          <p class="model-job-progress-value">{{ progressValue }}%</p>
        </div>

        <div class="model-job-progress-rail">
          <ol class="model-job-roadmap" aria-label="Reconstruction stages">
            <li
              v-for="item in roadmapItems"
              :key="item.key"
              class="model-job-roadmap-item"
              :class="`model-job-roadmap-item--${item.state}`"
            >
              <span class="model-job-roadmap-dot" aria-hidden="true"></span>
              <span class="model-job-roadmap-copy">
                <span class="model-job-roadmap-label">{{ item.label }}</span>
              </span>
            </li>
          </ol>

          <div class="model-job-status-footer" :class="{ 'model-job-status-footer--action': canOpenGeneratedModel }">
            <p v-if="progressNote" class="model-job-progress-note">{{ progressNote }}</p>

            <button v-if="canOpenGeneratedModel" class="btn btn-primary model-job-action-button" type="button"
              @click="openGeneratedModel">
              Open generated model
            </button>
          </div>
        </div>
      </section>

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
    </section>
  </div>
</template>
