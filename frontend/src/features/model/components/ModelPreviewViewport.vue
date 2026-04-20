<script setup lang="ts">
import { defineAsyncComponent, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useModelPreview } from '@/features/model/application/useModelPreview'

const MobileJoystick = defineAsyncComponent(() => import('@/features/island/components/MobileJoystick.vue'))

const props = withDefaults(defineProps<{
  interactive?: boolean
  showOverlay?: boolean
  meshUrl?: string | null
  textureUrl?: string | null
  placeholder?: 'cube' | null
  orientation?: { x: number; y: number; z: number } | null
  loadingLabel?: string
}>(), {
  interactive: true,
  showOverlay: true,
  meshUrl: null,
  textureUrl: null,
  placeholder: null,
  orientation: null,
  loadingLabel: 'Loading model preview',
})

const emit = defineEmits<{
  (event: 'orientation-change', orientation: { x: number; y: number; z: number }): void
}>()

const isLoading = ref(Boolean(props.meshUrl || props.placeholder))
const hasError = ref(false)
const element = useTemplateRef<HTMLElement>('scene-element-container')
const { mount, setOrientation, setPanInput } = useModelPreview({
  interactive: props.interactive,
  meshUrl: props.meshUrl,
  textureUrl: props.textureUrl,
  placeholder: props.placeholder,
  orientation: props.orientation,
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

function handleJoystickMove(input: { x: number; y: number }) {
  setPanInput(input)
}
</script>

<template>
  <div class="model-preview">
    <div ref="scene-element-container" class="model-preview-canvas" aria-label="Interactive model preview"></div>
    <div v-if="interactive && !hasError" class="model-preview-zoom-controls" aria-label="Preview zoom controls">
      <div class="model-preview-control-cluster">
        <mobile-joystick class="model-preview-joystick" @move="handleJoystickMove"></mobile-joystick>
      </div>
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
    </div>
  </div>
</template>
