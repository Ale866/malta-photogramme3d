<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { sceneFactory } from '@/core/three/sceneFactory'

const route = useRoute()

onMounted(() => {
  const container = document.getElementById('three-root')!
  sceneFactory.init(container)
  window.addEventListener('resize', () => sceneFactory.resize())
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', () => sceneFactory.resize())
})

watch(() => route.fullPath, (path) => sceneFactory.setVisible(path === '/'),
  { immediate: true })
</script>

<template>
</template>
