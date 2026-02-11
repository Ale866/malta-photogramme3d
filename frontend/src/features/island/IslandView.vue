<script setup lang="ts">
import { onMounted } from 'vue'
import { useScene } from '@/core/composables/useScene'
import SearchBar from '@/components/SearchBar.vue'

const { initScene, getOrchestrator } = useScene()

onMounted(async () => {
  const container = document.getElementById('three-root')!

  await initScene(container, {
    terrainUrl: '/terrain/malta.glb',
    utmBbox: {
      minE: 426480.6836,
      minN: 3960443.4018,
      maxE: 461756.6479,
      maxN: 3993330.0808,
    }
  })
})

function onSearchSelected(query: SearchEntry) {
  const orchestrator = getOrchestrator()
  orchestrator.getNavigationService().goToLatLon(query.lat, query.lon)
}

</script>

<template>
  <search-bar @search-selected="onSearchSelected"></search-bar>
</template>
