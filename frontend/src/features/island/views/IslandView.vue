<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScene } from '@/features/island/composables/useScene'
import SearchBar from '@/components/SearchBar.vue'
import ModelCreationModal from '@/features/model/components/ModelCreationModal.vue'
import type { MappedCoordinates } from '@/core/domain/Coordinates'

const { initScene, getOrchestrator } = useScene()
const selectedCoordinates = ref<MappedCoordinates | null>(null)
const isCreateModelOpen = ref(false)

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

  getOrchestrator().setOnTerrainClick((coordinates) => {
    selectedCoordinates.value = coordinates
    isCreateModelOpen.value = true
  })
})

function onSearchSelected(query: SearchEntry) {
  const orchestrator = getOrchestrator()
  orchestrator.getNavigationService().goToLatLon(query.lat, query.lon)
}

function closeCreateModel() {
  isCreateModelOpen.value = false
}

onUnmounted(() => {
  getOrchestrator().setOnTerrainClick(null)
})

</script>

<template>
  <search-bar @search-selected="onSearchSelected"></search-bar>
  <model-creation-modal :open="isCreateModelOpen" :coordinates="selectedCoordinates" @close="closeCreateModel" />
</template>
