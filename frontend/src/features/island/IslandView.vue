<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { sceneFactory } from '@/core/three/sceneFactory'
import SearchBar from '@/components/SearchBar.vue'

onMounted(() => {
  const container = document.getElementById('three-root')!
  sceneFactory.init(container)
  sceneFactory.setUtmBbox({
    minE: 426480.6836,
    minN: 3960443.4018,
    maxE: 461756.6479,
    maxN: 3993330.0808,
  });
  window.addEventListener('resize', sceneFactory.resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', sceneFactory.resize)
})

function onSearchSelected(query: SearchEntry) {
  sceneFactory.goToLatLon(query.lat, query.lon)
}

</script>

<template>
  <search-bar @search-selected="onSearchSelected"></search-bar>
</template>
