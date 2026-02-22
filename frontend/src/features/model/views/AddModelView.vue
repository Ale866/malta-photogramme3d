<template>
  <div class="add-model-page">
    <div class="add-model">
      <h1>Add Model</h1>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success">{{ successMessage }}</p>

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

<style scoped>
.add-model-page {
  position: fixed;
  inset: 0;
  z-index: 4;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.add-model {
  width: min(560px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 1rem;
  background: #1c1c1c;
  color: #fff;
  border-radius: 8px;
  font-family: sans-serif;
}

h1 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.error {
  color: #ff8080;
}

.success {
  color: #86db95;
}
</style>
