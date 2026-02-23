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
import { onMounted, onUnmounted, ref, toRefs } from 'vue'
import ModelCreationForm from '@/features/model/components/ModelCreationForm.vue'
import { use3dModel } from '@/features/model/application/useModel'
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
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const close = () => {
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
  window.removeEventListener('click', handleOutsideClick, true)
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
    emit('submitted', result.jobId)
    close()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>
