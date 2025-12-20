<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { sceneFactory } from '@/core/three/sceneFactory'

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
  <div class="search-container">
    <input type="text" class="searchbar" placeholder="Search" />
  </div>
</template>

<style scoped>
.search-container {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 10;
  pointer-events: none;
}

.searchbar {
  pointer-events: auto;
  padding: 10px 12px;
  width: 240px;
  border-radius: 8px;
  border: none;
  outline: none;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
</style>
