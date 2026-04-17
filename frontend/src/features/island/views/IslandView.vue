<script setup lang="ts">
import { inject, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MALTA_TERRAIN_UTM_BBOX } from '@/core/config/maltaTerrainBounds'
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
const {
  attachInteractions,
  renderModels,
  refreshLoadingPriorities,
  focusModel,
  exitFocusMode,
  isFocusModeActive,
  dispose: disposeIslandModelLayer,
} = useIslandModelLayer()
let stopCameraChangeListener: (() => void) | null = null
let viewportProjectionPort: ViewportProjectionPort | null = null
let cameraController: CameraController | null = null
let islandOrchestrator: IslandOrchestrator | null = null
let isViewActive = true
const sceneRoot = inject('sceneRoot') as { value: HTMLElement | null } | null
const route = useRoute()
const router = useRouter()
const { placements, refresh, findById } = islandModelCatalogStore
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

function handleSearchSelected(query: SearchEntry) {
  if (isFocusModeActive.value && islandOrchestrator) {
    exitFocusMode(islandOrchestrator)
  }

  onSearchSelected(query)
}

function exitFocusedModel() {
  if (!islandOrchestrator) return

  exitFocusMode(islandOrchestrator)
}

function openCreatedJobDetails(jobId: string) {
  void router.push({ name: 'ModelJobDetails', params: { jobId }, query: { from: 'list' } })
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isFocusModeActive.value || !islandOrchestrator) return

  exitFocusMode(islandOrchestrator)
}

async function focusRequestedModel(modelId: string) {
  if (!islandOrchestrator) return

  const focusedModel = findById(modelId)
  if (!focusedModel) return

  clearTerrainSelection()
  focusModel(islandOrchestrator, focusedModel)
}

onMounted(async () => {
  window.addEventListener('keydown', handleWindowKeydown)
  const container = sceneRoot?.value
  if (!container) {
    throw new Error('Scene root is not available.')
  }

  try {
    islandOrchestrator = await initScene(container, {
      terrainUrl: '/terrain/malta.glb',
      utmBbox: MALTA_TERRAIN_UTM_BBOX,
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

    await refresh()
    await renderModels(islandOrchestrator, placements.value)
    attachInteractions(islandOrchestrator, {
      onModelFocus: () => {
        clearTerrainSelection()
      },
    })
    refreshLoadingPriorities(islandOrchestrator)

    const focusedModelId = typeof route.query.modelId === 'string' ? route.query.modelId : null
    if (focusedModelId) {
      await focusRequestedModel(focusedModelId)
    }

    stopCameraChangeListener = viewportProjectionPort.onViewportChange(() => {
      if (islandOrchestrator) {
        refreshLoadingPriorities(islandOrchestrator)
      }
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
  window.removeEventListener('keydown', handleWindowKeydown)
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
    <search-bar @search-selected="handleSearchSelected"></search-bar>
    <button v-if="markerButtonVisible" class="btn btn-primary btn-pill island-marker-add-model" type="button"
      :style="markerButtonStyle" @click.stop="openCreateModel">
      Add model
    </button>
    <button
      v-if="isFocusModeActive"
      class="btn island-focus-exit"
      type="button"
      @click.stop="exitFocusedModel"
    >
      Back to island
    </button>
    <model-creation-modal
      :open="isCreateModelOpen"
      :coordinates="terrainSelectionCoordinates!"
      @close="closeCreateModel"
      @open-job-details="openCreatedJobDetails"
    />
    <login-modal :open="isLoginModalOpen" @close="closeLoginModal" @success="onLoginSuccess" />
    <profile-dock />
    <mobile-joystick class="island-mobile-joystick" @move="onMobileJoystickMove" />
  </div>
</template>
