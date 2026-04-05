<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useModelPreview } from '@/features/model/application/useModelPreview'

const props = withDefaults(defineProps<{
  interactive?: boolean
  showOverlay?: boolean
  meshUrl?: string | null
  textureUrl?: string | null
  loadingLabel?: string
}>(), {
  interactive: true,
  showOverlay: true,
  meshUrl: null,
  textureUrl: null,
  loadingLabel: 'Loading model preview',
})

const isLoading = ref(Boolean(props.meshUrl))
const hasError = ref(false)
const element = useTemplateRef<HTMLElement>('scene-element-container')
const { mount } = useModelPreview({
  interactive: props.interactive,
  meshUrl: props.meshUrl,
  textureUrl: props.textureUrl,
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
</script>

<template>
  <div class="model-preview">
    <div ref="scene-element-container" class="model-preview-canvas" aria-label="Interactive model preview"></div>
    <div v-if="isLoading" class="model-preview-loader" aria-live="polite">
      <div class="model-preview-loader-spinner" aria-hidden="true"></div>
      <p class="model-preview-loader-text">{{ loadingLabel }}</p>
    </div>
    <div v-else-if="hasError" class="model-preview-loader model-preview-loader--error" aria-live="polite">
      <p class="model-preview-loader-text">Preview unavailable</p>
    </div>
    <div v-if="showOverlay" class="model-preview-overlay">
      <p class="model-preview-label">Preview</p>
      <p class="model-preview-caption">Drag inside the viewer to inspect the generated model.</p>
    </div>
  </div>
</template>
