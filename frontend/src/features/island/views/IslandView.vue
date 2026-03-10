<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useScene } from '@/features/island/composables/useScene'
import { useIslandModelLayer } from '@/features/island/composables/useIslandModelLayer'
import SearchBar from '@/components/SearchBar.vue'
import ModelCreationModal from '@/features/model/components/ModelCreationModal.vue'
import MobileJoystick from '@/features/island/components/MobileJoystick.vue'
import type { ViewportProjectionPort } from '@/features/island/domain/ViewportProjectionPort'
import type { CameraController } from '@/core/three/controls/CameraController'
import type { IslandOrchestrator } from '@/features/island/application/IslandOrchestrator'
import LoginModal from '@/features/auth/components/LoginModal.vue'
import { useAuth } from '@/features/auth/application/useAuth'
import { useIslandModelCatalog } from '@/features/model/application/composables/useIslandModelCatalog'

type IslandMode =
  | { kind: 'idle' }
  | { kind: 'terrain-selection'; coordinates: { x: number; y: number; z: number } }
  | { kind: 'focused-model'; modelId: string }

const { initScene, getOrchestrator, getViewportProjectionPort } = useScene()
const { attachInteractions, renderModels, focusModel, dispose: disposeIslandModelLayer } = useIslandModelLayer()
const mode = ref<IslandMode>({ kind: 'idle' })
const isCreateModelOpen = ref(false)
const isLoginModalOpen = ref(false)
const markerButtonVisible = ref(false)
const markerButtonStyle = ref<{ left: string; top: string }>({
  left: '0px',
  top: '0px',
})
const screenProjection = { x: 0, y: 0, visible: false }
let stopCameraChangeListener: (() => void) | null = null
let viewportProjectionPort: ViewportProjectionPort | null = null
let cameraController: CameraController | null = null
let islandOrchestrator: IslandOrchestrator | null = null
let isViewActive = true
const auth = useAuth()
const route = useRoute()
const { placements, ensureLoaded, findById } = useIslandModelCatalog()
const terrainSelectionCoordinates = computed(() =>
  mode.value.kind === 'terrain-selection' ? mode.value.coordinates : null
)

onMounted(async () => {
  const container = document.getElementById('three-root')!

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
      onModelFocus: (modelId) => {
        clearTerrainSelection()
        mode.value = { kind: 'focused-model', modelId }
      },
    })

    const focusedModelId = typeof route.query.modelId === 'string' ? route.query.modelId : null
    if (focusedModelId) {
      const focusedModel = findById(focusedModelId)
      if (focusedModel) {
        clearTerrainSelection()
        focusModel(islandOrchestrator, focusedModel.coordinates)
        mode.value = { kind: 'focused-model', modelId: focusedModelId }
      }
    }

    stopCameraChangeListener = viewportProjectionPort.onViewportChange(() => {
      if (terrainSelectionCoordinates.value && !isCreateModelOpen.value && !isLoginModalOpen.value) {
        updateMarkerButtonPosition()
      }
    })
  } catch (error) {
    console.error('Failed to initialize island view:', error)
  }
})

function onSearchSelected(query: SearchEntry) {
  const orchestrator = islandOrchestrator ?? getOrchestrator()
  clearTerrainSelection()
  const coordinates = orchestrator.getNavigationService().goToLatLon(query.lat, query.lon)
  setTerrainSelection(coordinates)
}

function setTerrainSelection(coordinates: { x: number, y: number, z: number }) {
  mode.value = { kind: 'terrain-selection', coordinates }
  isCreateModelOpen.value = false
  isLoginModalOpen.value = false
  updateMarkerButtonPosition()
}

function clearTerrainSelection() {
  if (mode.value.kind === 'terrain-selection') {
    mode.value = { kind: 'idle' }
  }
  markerButtonVisible.value = false
  islandOrchestrator?.getNavigationService().removeMarker()
}

function closeCreateModel() {
  isCreateModelOpen.value = false
  if (terrainSelectionCoordinates.value) {
    updateMarkerButtonPosition()
  } else {
    markerButtonVisible.value = false
  }
}

async function openCreateModel() {
  if (!terrainSelectionCoordinates.value) return

  let authenticated = auth.isAuthenticated.value
  if (!authenticated) {
    await auth.hydrateSession()
    authenticated = auth.isAuthenticated.value
  }

  if (!authenticated) {
    isLoginModalOpen.value = true
    markerButtonVisible.value = false
    return
  }

  isCreateModelOpen.value = true
  isLoginModalOpen.value = false
  markerButtonVisible.value = false
}

function closeLoginModal() {
  isLoginModalOpen.value = false
  if (terrainSelectionCoordinates.value && !isCreateModelOpen.value) {
    updateMarkerButtonPosition()
  }
}

function onLoginSuccess() {
  isLoginModalOpen.value = false
  if (terrainSelectionCoordinates.value) {
    isCreateModelOpen.value = true
    markerButtonVisible.value = false
  }
}

function updateMarkerButtonPosition() {
  if (!terrainSelectionCoordinates.value || isCreateModelOpen.value || isLoginModalOpen.value) {
    markerButtonVisible.value = false
    return
  }
  if (!viewportProjectionPort) {
    markerButtonVisible.value = false
    return
  }

  const screen = viewportProjectionPort.projectPoint(
    terrainSelectionCoordinates.value,
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
    <mobile-joystick class="island-mobile-joystick" @move="onMobileJoystickMove" />
  </div>
</template>
