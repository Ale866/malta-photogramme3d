<template>
  <Teleport to="body">
    <div v-if="open" class="model-sheet-host" @click.self="close">
      <section class="model-sheet" role="dialog" aria-modal="true" aria-label="Create model" @click.stop>
        <header class="model-sheet-header">
          <h2 class="model-sheet-title">Create Model</h2>
          <button type="button" class="btn btn-icon model-sheet-close" aria-label="Close popup" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </header>

        <p v-if="errorMessage" class="text-error model-sheet-error">{{ errorMessage }}</p>

        <model-creation-form
          :coordinates="props.coordinates"
          :is-submitting="isSubmitting"
          :is-locked="Boolean(submittedJobId)"
          :submitted-job-id="submittedJobId"
          :submit-label="submittedJobId ? 'Model submitted' : 'Upload model'"
          @submit="handleSubmit"
          @open-job-details="openJobDetails"
        />
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ModelCreationForm from '@/features/model/components/ModelCreationForm.vue'
import { use3dModel } from '@/features/model/application/useModel'
import type { ModelCreationDraft } from '@/features/model/domain/ModelCreationDraft'

const props = withDefaults(defineProps<{
  open: boolean
  coordinates: { x: number, y: number, z: number }
}>(), {
  coordinates: () => ({ x: 0, y: 0, z: 0 }),
})

const emit = defineEmits<{
  close: []
  openJobDetails: [jobId: string]
}>()

const { uploadModel } = use3dModel()
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const submittedJobId = ref<string | null>(null)

function resetModalState() {
  errorMessage.value = null
  submittedJobId.value = null
}

const close = () => {
  resetModalState()
  emit('close')
}

const openJobDetails = () => {
  if (!submittedJobId.value) return
  emit('openJobDetails', submittedJobId.value)
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
    submittedJobId.value = result.jobId
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>
