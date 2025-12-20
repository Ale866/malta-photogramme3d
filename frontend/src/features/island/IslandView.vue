<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { sceneFactory } from '@/core/three/sceneFactory'
import SearchBar from '@/components/SearchBar.vue'

onMounted(() => {
  const container = document.getElementById('three-root')!
  sceneFactory.init(container)
  window.addEventListener('resize', sceneFactory.resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', sceneFactory.resize)
})

</script>

<template>
  <search-bar></search-bar>
</template>
