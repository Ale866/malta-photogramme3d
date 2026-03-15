<template>
  <Teleport to="body">
    <div v-if="open" class="model-sheet-host" @click.self="close">
      <section class="model-sheet" role="dialog" aria-modal="true" aria-label="Create model" @click.stop>
        <header class="model-sheet-header">
          <div>
            <h2 class="model-sheet-title">Create Model</h2>
            <p class="text-muted model-sheet-subtitle">Tap on the map to change selection at any time.</p>
          </div>
          <button type="button" class="btn btn-icon model-sheet-close" aria-label="Close popup" @click="close">
            X
          </button>
        </header>

        <p v-if="errorMessage" class="text-error model-sheet-error">{{ errorMessage }}</p>
        <div v-if="jobStatus" class="model-job-status">
          <div class="model-job-status-header">
            <p class="model-job-status-title">Processing model</p>
            <span class="model-job-status-badge">{{ jobStatus.status }}</span>
          </div>
          <p class="text-muted model-job-status-stage">{{ jobStatus.stage }}</p>
          <div class="model-job-status-progress" aria-hidden="true">
            <span :style="{ width: `${jobStatus.progress}%` }"></span>
          </div>
          <p class="model-job-status-progress-label">{{ jobStatus.progress }}%</p>
          <p v-if="jobStatus.error" class="text-error model-sheet-error">{{ jobStatus.error }}</p>
        </div>
        <p v-if="trackingError" class="text-error model-sheet-error">{{ trackingError }}</p>

        <model-creation-form :coordinates="props.coordinates" :is-submitting="isSubmitting" submit-label="Upload model"
          @submit="handleSubmit" />
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ModelCreationForm from '@/features/model/components/ModelCreationForm.vue'
import { use3dModel } from '@/features/model/application/useModel'
import { useModelJobTracker } from '@/features/model/application/useModelJobTracker'
import type { ModelCreationDraft } from '@/features/model/domain/ModelCreationDraft'

const props = withDefaults(defineProps<{
  open: boolean
  coordinates: { x: number, y: number, z: number }
}>(), {
  coordinates: () => ({ x: 0, y: 0, z: 0 }),
})

const emit = defineEmits<{
  close: []
  submitted: [jobId: string]
}>()

const { uploadModel } = use3dModel()
const {
  job: jobStatus,
  trackingError,
  start: startTracking,
  stop: stopTracking,
} = useModelJobTracker()
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

function resetModalState() {
  stopTracking()
  jobStatus.value = null
  errorMessage.value = null
}

const close = () => {
  resetModalState()
  emit('close')
}

watch(() => props.open, (isOpen) => {
  if (isOpen) return
  resetModalState()
})

const handleSubmit = async (draft: ModelCreationDraft) => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = null

  try {
    const result = await uploadModel({
      ...draft,
      coordinates: props.coordinates ?? draft.coordinates,
    })
    await startTracking(result.jobId)
    emit('submitted', result.jobId)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>
