<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useModelPreview } from '@/features/model/application/useModelPreview'

const props = withDefaults(defineProps<{
  interactive?: boolean
  showOverlay?: boolean
  meshUrl?: string | null
  textureUrl?: string | null
  orientation?: { x: number; y: number; z: number } | null
  dragMode?: 'orbit' | 'roll'
  loadingLabel?: string
  overlayCaption?: string
}>(), {
  interactive: true,
  showOverlay: true,
  meshUrl: null,
  textureUrl: null,
  orientation: null,
  dragMode: 'orbit',
  loadingLabel: 'Loading model preview',
  overlayCaption: 'Drag inside the viewer to inspect the generated model.',
})

const emit = defineEmits<{
  (event: 'orientation-change', orientation: { x: number; y: number; z: number }): void
}>()

const isLoading = ref(Boolean(props.meshUrl))
const hasError = ref(false)
const element = useTemplateRef<HTMLElement>('scene-element-container')
const { mount, setOrientation, setDragMode, zoomIn, zoomOut, resetZoom } = useModelPreview({
  interactive: props.interactive,
  meshUrl: props.meshUrl,
  textureUrl: props.textureUrl,
  orientation: props.orientation,
  dragMode: props.dragMode,
  onOrientationChange: (orientation) => emit('orientation-change', orientation),
  onLoaded: () => {
    isLoading.value = false
    hasError.value = false
  },
  onError: () => {
    isLoading.value = false
    hasError.value = true
  },
})

onMounted(async () => {
  await nextTick()
  mount(element.value ?? null)
})

watch(
  () => props.orientation,
  (orientation) => {
    if (!orientation) return
    setOrientation(orientation)
  },
  { deep: true }
)

watch(
  () => props.dragMode,
  (dragMode) => {
    setDragMode(dragMode)
  }
)
</script>

<template>
  <div class="model-preview">
    <div ref="scene-element-container" class="model-preview-canvas" aria-label="Interactive model preview"></div>
    <div v-if="interactive && !hasError" class="model-preview-zoom-controls" aria-label="Preview zoom controls">
      <button class="btn model-preview-zoom-button" type="button" @click="zoomIn">
        +
      </button>
      <button class="btn model-preview-zoom-button" type="button" @click="zoomOut">
        -
      </button>
      <button class="btn model-preview-zoom-button model-preview-zoom-button--reset" type="button" @click="resetZoom">
        100%
      </button>
    </div>
    <div v-if="isLoading" class="model-preview-loader" aria-live="polite">
      <div class="model-preview-loader-spinner" aria-hidden="true"></div>
      <p class="model-preview-loader-text">{{ loadingLabel }}</p>
    </div>
    <div v-else-if="hasError" class="model-preview-loader model-preview-loader--error" aria-live="polite">
      <p class="model-preview-loader-text">Preview unavailable</p>
    </div>
    <div v-if="showOverlay" class="model-preview-overlay">
      <p class="model-preview-label">Preview</p>
      <p class="model-preview-caption">{{ overlayCaption }}</p>
    </div>
  </div>
</template>
