<script setup lang="ts">
import { inject, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useScene } from '@/features/island/composables/useScene'
import { useIslandModelLayer } from '@/features/island/composables/useIslandModelLayer'
import { useIslandSelectionFlow } from '@/features/island/composables/useIslandSelectionFlow'
import SearchBar from '@/components/SearchBar.vue'
import ModelCreationModal from '@/features/model/components/ModelCreationModal.vue'
import MobileJoystick from '@/features/island/components/MobileJoystick.vue'
import type { ViewportProjectionPort } from '@/features/island/domain/ViewportProjectionPort'
import type { CameraController } from '@/core/three/controls/CameraController'
import type { IslandOrchestrator } from '@/features/island/application/IslandOrchestrator'
import LoginModal from '@/features/auth/components/LoginModal.vue'
import ProfileDock from '@/features/auth/components/ProfileDock.vue'
import { islandModelCatalogStore } from '@/features/model/application/composables/useIslandModelCatalog'

const { initScene, getOrchestrator, getViewportProjectionPort } = useScene()
const { attachInteractions, renderModels, focusModel, dispose: disposeIslandModelLayer } = useIslandModelLayer()
let stopCameraChangeListener: (() => void) | null = null
let viewportProjectionPort: ViewportProjectionPort | null = null
let cameraController: CameraController | null = null
let islandOrchestrator: IslandOrchestrator | null = null
let isViewActive = true
const sceneRoot = inject('sceneRoot') as { value: HTMLElement | null } | null
const route = useRoute()
const { placements, ensureLoaded, findById } = islandModelCatalogStore
const {
  terrainSelectionCoordinates,
  isCreateModelOpen,
  isLoginModalOpen,
  markerButtonVisible,
  markerButtonStyle,
  onSearchSelected,
  setTerrainSelection,
  clearTerrainSelection,
  closeCreateModel,
  openCreateModel,
  closeLoginModal,
  onLoginSuccess,
  updateMarkerButtonPosition,
} = useIslandSelectionFlow({
  getOrchestrator: () => islandOrchestrator ?? getOrchestrator(),
  getViewportProjectionPort: () => viewportProjectionPort,
})

onMounted(async () => {
  const container = sceneRoot?.value
  if (!container) {
    throw new Error('Scene root is not available.')
  }

  try {
    islandOrchestrator = await initScene(container, {
      terrainUrl: '/terrain/malta.glb',
      utmBbox: {
        minE: 426480.6836,
        minN: 3960443.4018,
        maxE: 461756.6479,
        maxN: 3993330.0808,
      },
    })

    if (!isViewActive || !islandOrchestrator) {
      return
    }

    cameraController = islandOrchestrator.getCameraController()
    viewportProjectionPort = getViewportProjectionPort()
    islandOrchestrator.setOnTerrainClick((coordinates) => {
      if (!coordinates) {
        clearTerrainSelection()
        return
      }

      setTerrainSelection(coordinates.local)
    })

    await ensureLoaded()
    renderModels(islandOrchestrator, placements.value)
    attachInteractions(islandOrchestrator, {
      onModelFocus: () => {
        clearTerrainSelection()
      },
    })

    const focusedModelId = typeof route.query.modelId === 'string' ? route.query.modelId : null
    if (focusedModelId) {
      const focusedModel = findById(focusedModelId)
      if (focusedModel) {
        clearTerrainSelection()
        focusModel(islandOrchestrator, focusedModel.coordinates)
      }
    }

    stopCameraChangeListener = viewportProjectionPort.onViewportChange(() => {
      updateMarkerButtonPosition()
    })
  } catch (error) {
    console.error('Failed to initialize island view:', error)
  }
})

function onMobileJoystickMove(input: { x: number; y: number }) {
  cameraController?.setMobileMoveInput(input)
}

onUnmounted(() => {
  isViewActive = false
  disposeIslandModelLayer()
  cameraController?.setMobileMoveInput({ x: 0, y: 0 })
  cameraController = null

  if (stopCameraChangeListener) {
    stopCameraChangeListener()  
    stopCameraChangeListener = null
  }
  viewportProjectionPort = null
  islandOrchestrator?.setOnTerrainClick(null)
  islandOrchestrator = null
})

</script>

<template>
  <div class="island-view-root">
    <search-bar @search-selected="onSearchSelected"></search-bar>
    <button v-if="markerButtonVisible" class="btn btn-primary btn-pill island-marker-add-model" type="button"
      :style="markerButtonStyle" @click.stop="openCreateModel">
      Add model
    </button>
    <model-creation-modal :open="isCreateModelOpen" :coordinates="terrainSelectionCoordinates!" @close="closeCreateModel" />
    <login-modal :open="isLoginModalOpen" @close="closeLoginModal" @success="onLoginSuccess" />
    <profile-dock />
    <mobile-joystick class="island-mobile-joystick" @move="onMobileJoystickMove" />
  </div>
</template>
