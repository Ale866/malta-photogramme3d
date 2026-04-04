<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef } from 'vue'
import { useModelPreview } from '@/features/model/application/useModelPreview'

const props = withDefaults(defineProps<{
  interactive?: boolean
  showOverlay?: boolean
  meshUrl?: string | null
  textureUrl?: string | null
}>(), {
  interactive: true,
  showOverlay: true,
  meshUrl: null,
  textureUrl: null,
})

const element = useTemplateRef<HTMLElement>('scene-element-container')
const { mount } = useModelPreview({
  interactive: props.interactive,
  meshUrl: props.meshUrl,
  textureUrl: props.textureUrl,
})

onMounted(async () => {
  await nextTick()
  mount(element.value ?? null)
})
</script>

<template>
  <div class="model-preview">
    <div ref="scene-element-container" class="model-preview-canvas" aria-label="Interactive model preview"></div>
    <div v-if="showOverlay" class="model-preview-overlay">
      <p class="model-preview-label">Preview</p>
      <p class="model-preview-caption">Drag inside the viewer to inspect the generated model.</p>
    </div>
  </div>
</template>
