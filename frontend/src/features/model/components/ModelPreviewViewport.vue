<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef } from 'vue'
import { useModelPreview } from '@/features/model/application/useModelPreview'

const element = useTemplateRef<HTMLElement>('scene-element-container')
const { mount } = useModelPreview()

onMounted(async () => {
  await nextTick()
  mount(element.value ?? null)
})
</script>

<template>
  <div class="model-preview">
    <div ref="scene-element-container" class="model-preview-canvas" aria-label="Interactive model preview"></div>
    <div class="model-preview-overlay">
      <p class="model-preview-label">Preview</p>
      <p class="model-preview-caption">Drag inside the viewer to inspect the temporary model placeholder.</p>
    </div>
  </div>
</template>
