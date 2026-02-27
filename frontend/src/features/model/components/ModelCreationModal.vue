<template>
  <Teleport to="body">
    <div v-if="open" class="model-sheet-host">
      <section
        ref="sheetRef"
        class="model-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Create model"
      >
        <header class="model-sheet-header">
          <div>
            <h2 class="model-sheet-title">Create Model</h2>
            <p class="text-muted model-sheet-subtitle">Tap on the map to change selection at any time.</p>
          </div>
          <button
            type="button"
            class="btn btn-icon model-sheet-close"
            aria-label="Close popup"
            @click="close"
          >
            X
          </button>
        </header>

        <p v-if="errorMessage" class="text-error model-sheet-error">{{ errorMessage }}</p>
        <div v-if="jobStatus" class="add-model-job-status">
          <p><strong>Job:</strong> {{ jobStatus.jobId }}</p>
          <p><strong>Status:</strong> {{ jobStatus.status }}</p>
          <p><strong>Stage:</strong> {{ jobStatus.stage }}</p>
          <p><strong>Progress:</strong> {{ jobStatus.progress }}%</p>
          <p><strong>Mode:</strong> {{ mode }}</p>
          <p><strong>Socket:</strong> {{ isSocketConnected ? 'connected' : 'disconnected' }}</p>
          <p v-if="jobStatus.modelId"><strong>Model ID:</strong> {{ jobStatus.modelId }}</p>
          <p v-if="jobStatus.error" class="text-error"><strong>Error:</strong> {{ jobStatus.error }}</p>
        </div>
        <p v-if="trackingError" class="text-error model-sheet-error">{{ trackingError }}</p>

        <ModelCreationForm
          :coordinates="coordinates"
          :is-submitting="isSubmitting"
          submit-label="Upload model"
          @submit="handleSubmit"
        />
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, toRefs, watch } from 'vue'
import ModelCreationForm from '@/features/model/components/ModelCreationForm.vue'
import { use3dModel } from '@/features/model/application/useModel'
import { useModelJobTracker } from '@/features/model/application/useModelJobTracker'
import type { ModelCreationDraft, ModelCoordinates } from '@/features/model/domain/ModelCreationDraft'

const props = withDefaults(defineProps<{
  open: boolean
  coordinates?: ModelCoordinates | null
}>(), {
  coordinates: null,
})

const { open, coordinates } = toRefs(props)
const sheetRef = ref<HTMLElement | null>(null)

const emit = defineEmits<{
  close: []
  submitted: [jobId: string]
}>()

const { uploadModel } = use3dModel()
const {
  job: jobStatus,
  trackingError,
  mode,
  isSocketConnected,
  start: startTracking,
  stop: stopTracking,
} = useModelJobTracker()
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const close = () => {
  stopTracking()
  jobStatus.value = null
  errorMessage.value = null
  emit('close')
}

const handleOutsideClick = (event: MouseEvent) => {
  if (!open.value) return

  const target = event.target as Node | null
  const sheet = sheetRef.value
  if (!target || !sheet) return

  if (sheet.contains(target)) return

  const sceneRoot = document.getElementById('three-root')
  const isSceneClick = !!sceneRoot && sceneRoot.contains(target)
  if (isSceneClick) return

  close()
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick, true)
})

onUnmounted(() => {
  stopTracking()
  window.removeEventListener('click', handleOutsideClick, true)
})

watch(open, (isOpen) => {
  if (isOpen) return
  stopTracking()
  jobStatus.value = null
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
