<template>
  <div class="add-model-page">
    <div class="add-model-page-card">
      <h1 class="add-model-page-title">Add Model</h1>
      <div v-if="errorMessage" class="text-error">{{ errorMessage }}</div>
      <div v-if="successMessage" class="text-success">{{ successMessage }}</div>
      <div v-if="jobStatus" class="add-model-job-status">
        <div><strong>Job:</strong> {{ jobStatus.jobId }}</div>
        <div><strong>Status:</strong> {{ jobStatus.status }}</div>
        <div><strong>Stage:</strong> {{ jobStatus.stage }}</div>
        <div><strong>Progress:</strong> {{ jobStatus.progress }}%</div>
        <div v-if="jobStatus.modelId"><strong>Model ID:</strong> {{ jobStatus.modelId }}</div>
        <div v-if="jobStatus.error" class="text-error"><strong>Error:</strong> {{ jobStatus.error }}</div>
      </div>
      <div v-if="trackingError" class="text-error">{{ trackingError }}</div>

      <ModelCreationForm :is-submitting="isSubmitting" submit-label="Upload model" @submit="submitForm" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { use3dModel } from '../application/useModel'
import { useModelJobTracker } from '../application/useModelJobTracker'
import ModelCreationForm from '../components/ModelCreationForm.vue'
import type { ModelCreationDraft } from '../domain/ModelCreationDraft'

const { uploadModel } = use3dModel()
const { job: jobStatus, trackingError, start: startTracking } = useModelJobTracker()
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const submitForm = async (draft: ModelCreationDraft) => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const result = await uploadModel(draft)
    successMessage.value = `Upload accepted. Job ID: ${result.jobId}`
    await startTracking(result.jobId)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>
