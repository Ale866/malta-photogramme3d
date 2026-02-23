<template>
  <div class="add-model-page">
    <div class="add-model-page-card">
      <h1 class="add-model-page-title">Add Model</h1>
      <p v-if="errorMessage" class="text-error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="text-success">{{ successMessage }}</p>

      <ModelCreationForm
        :is-submitting="isSubmitting"
        submit-label="Upload model"
        @submit="submitForm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { use3dModel } from '../application/useModel'
import ModelCreationForm from '../components/ModelCreationForm.vue'
import type { ModelCreationDraft } from '../domain/ModelCreationDraft'

const { uploadModel } = use3dModel()
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
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>
