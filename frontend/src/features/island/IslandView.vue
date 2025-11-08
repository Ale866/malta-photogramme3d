<template>
  <div ref="container" class="scene-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { sceneFactory } from '@/core/three/sceneFactory'

const container = ref<HTMLDivElement | null>(null)

const handleResize = () => sceneFactory.resize()

onMounted(() => {
  if (container.value) {
    sceneFactory.init(container.value)
    window.addEventListener('resize', handleResize)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: 100vh;
  background: #111;
  overflow: hidden;
}
</style>
