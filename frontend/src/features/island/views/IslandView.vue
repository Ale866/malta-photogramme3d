<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScene } from '@/features/island/composables/useScene'
import SearchBar from '@/components/SearchBar.vue'
import ModelCreationModal from '@/features/model/components/ModelCreationModal.vue'
import type { MappedCoordinates } from '@/core/domain/Coordinates'
import type { ThreeViewportProjectionAdapter } from '../infrastructure/ThreeViewportProjectionAdapter'

const { initScene, getOrchestrator } = useScene()
const selectedCoordinates = ref<MappedCoordinates | null>(null)
const isCreateModelOpen = ref(false)
const markerButtonVisible = ref(false)
const markerButtonStyle = ref<{ left: string; top: string }>({
  left: '0px',
  top: '0px',
})
const screenProjection = { x: 0, y: 0, visible: false }
let stopCameraChangeListener: (() => void) | null = null
let viewportProjectionPort: ThreeViewportProjectionAdapter | null = null

onMounted(async () => {
  const container = document.getElementById('three-root')!

  await initScene(container, {
    terrainUrl: '/terrain/malta.glb',
    utmBbox: {
      minE: 426480.6836,
      minN: 3960443.4018,
      maxE: 461756.6479,
      maxN: 3993330.0808,
    },
  })

  const orchestrator = getOrchestrator()
  viewportProjectionPort = orchestrator.getViewportProjectionPort()
  orchestrator.setOnTerrainClick((coordinates) => {
    selectedCoordinates.value = coordinates
    isCreateModelOpen.value = false
    updateMarkerButtonPosition()
  })

  stopCameraChangeListener = viewportProjectionPort.onViewportChange(() => {
    if (selectedCoordinates.value && !isCreateModelOpen.value) {
      updateMarkerButtonPosition()
    }
  })
})

function onSearchSelected(query: SearchEntry) {
  const orchestrator = getOrchestrator()
  orchestrator.getNavigationService().goToLatLon(query.lat, query.lon)
}

function closeCreateModel() {
  isCreateModelOpen.value = false
  if (selectedCoordinates.value) {
    updateMarkerButtonPosition()
  } else {
    markerButtonVisible.value = false
  }
}

function openCreateModel() {
  if (!selectedCoordinates.value) return
  isCreateModelOpen.value = true
  markerButtonVisible.value = false
}

function updateMarkerButtonPosition() {
  if (!selectedCoordinates.value || isCreateModelOpen.value) {
    markerButtonVisible.value = false
    return
  }
  if (!viewportProjectionPort) {
    markerButtonVisible.value = false
    return
  }

  const screen = viewportProjectionPort.projectPoint(
    selectedCoordinates.value.local,
    screenProjection
  )
  if (!screen.visible) {
    markerButtonVisible.value = false
    return
  }

  markerButtonStyle.value.left = `${screen.x}px`
  markerButtonStyle.value.top = `${screen.y}px`
  markerButtonVisible.value = true
}

onUnmounted(() => {
  if (stopCameraChangeListener) {
    stopCameraChangeListener()
    stopCameraChangeListener = null
  }
  viewportProjectionPort = null

  try {
    getOrchestrator().setOnTerrainClick(null)
  } catch {
    // No orchestrator when unmounted before initialization finishes.
  }
})

</script>

<template>
  <search-bar @search-selected="onSearchSelected"></search-bar>
  <button v-if="markerButtonVisible" class="marker-add-model-button" type="button" :style="markerButtonStyle"
    @click.stop="openCreateModel">
    Add model
  </button>
  <model-creation-modal :open="isCreateModelOpen" :coordinates="selectedCoordinates" @close="closeCreateModel" />
</template>

<style scoped>
.marker-add-model-button {
  position: fixed;
  z-index: 900;
  transform: translate(-50%, -150%);
  border: 1px solid #3f84ff;
  border-radius: 999px;
  background: #0d79ff;
  color: #fff;
  font-weight: 600;
  padding: 0.42rem 0.85rem;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .marker-add-model-button {
    transform: translate(-50%, -165%);
    padding: 0.38rem 0.75rem;
    font-size: 0.9rem;
  }
}
</style>
