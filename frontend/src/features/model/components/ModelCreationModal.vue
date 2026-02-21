<template>
  <Teleport to="body">
    <div v-if="open" class="top-sheet-host">
      <section
        ref="sheetRef"
        class="top-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Create model"
      >
        <header class="modal-header">
          <div>
            <h2>Create Model</h2>
            <p class="subtitle">Tap on the map to change selection at any time.</p>
          </div>
          <button type="button" aria-label="Close popup" @click="close">X</button>
        </header>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

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

<style scoped>
.top-sheet-host {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: calc(env(safe-area-inset-top, 0px) + 0.65rem) 0.75rem 0;
}

.top-sheet {
  pointer-events: auto;
  width: min(640px, 100%);
  min-height: 180px;
  overflow: auto;
  border-radius: 0 0 14px 14px;
  padding: 0.85rem 1rem 1rem;
  background: #1d1d1d;
  color: #fff;
  border: 1px solid #3f3f3f;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.modal-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
}

.modal-header button {
  background: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  line-height: 1;
}

.subtitle {
  margin: 0;
  font-size: 0.86rem;
  color: #c6c6c6;
}

.error {
  margin: 0 0 1rem;
  color: #ff8080;
}

@media (max-width: 700px) {
  .top-sheet-host {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  .top-sheet {
    max-height: 50vh;
    border-radius: 0 0 12px 12px;
    padding: 0.75rem;
  }
}
</style>
