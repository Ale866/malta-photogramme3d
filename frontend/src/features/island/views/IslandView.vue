<script setup lang="ts">
import { computed, defineAsyncComponent, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MALTA_TERRAIN_UTM_BBOX } from '@/core/config/maltaTerrainBounds'
import { useScene } from '@/features/island/composables/useScene'
import { useIslandModelLayer } from '@/features/island/composables/useIslandModelLayer'
import { useIslandSelectionFlow } from '@/features/island/composables/useIslandSelectionFlow'
import SearchBar from '@/components/SearchBar.vue'
import ModelCreationModal from '@/features/model/components/ModelCreationModal.vue'
const MobileJoystick = defineAsyncComponent(() => import('@/features/island/components/MobileJoystick.vue'))
import type { ViewportProjectionPort } from '@/features/island/domain/ViewportProjectionPort'
import type { CameraController } from '@/core/three/controls/CameraController'
import type { IslandOrchestrator } from '@/features/island/application/IslandOrchestrator'
import LoginModal from '@/features/auth/components/LoginModal.vue'
import ProfileDock from '@/features/auth/components/ProfileDock.vue'
import { islandModelCatalogStore } from '@/features/model/application/composables/useIslandModelCatalog'
import { isConservativeGraphicsDevice } from '@/core/device/performance'

const FULL_TERRAIN_URL = '/terrain/malta.glb'
const MOBILE_TERRAIN_URL = '/terrain/malta.mobile.glb'

const { initScene, getOrchestrator, getViewportProjectionPort } = useScene()
const {
  attachInteractions,
  renderModels,
  refreshLoadingPriorities,
  focusModel,
  exitFocusMode,
  focusedModelId,
  hoveredModelId,
  isFocusModeActive,
  isLoadingModels,
  dispose: disposeIslandModelLayer,
} = useIslandModelLayer()

const HOVER_LABEL_WORLD_OFFSET = 4.0
let stopCameraChangeListener: (() => void) | null = null
let viewportProjectionPort: ViewportProjectionPort | null = null
let cameraController: CameraController | null = null
let islandOrchestrator: IslandOrchestrator | null = null
let activeMountToken = 0
const isLoadingModelCatalog = ref(false)
const showModelLoadingHint = computed(() => isLoadingModelCatalog.value || isLoadingModels.value)
const hoveredModelLabelVisible = ref(false)
const hoveredModelLabelStyle = ref<{ left: string; top: string }>({
  left: '0px',
  top: '0px',
})
const sceneRoot = inject('sceneRoot') as { value: HTMLElement | null } | null
const route = useRoute()
const router = useRouter()
const { placements, refresh, findById } = islandModelCatalogStore
const hoveredModelScreenProjection = { x: 0, y: 0, visible: false }
const focusedIslandModel = computed(() => {
  const modelId = focusedModelId.value
  return modelId ? findById(modelId) : null
})
const hoveredIslandModel = computed(() => {
  if (isFocusModeActive.value) return null
  const modelId = hoveredModelId.value
  return modelId ? findById(modelId) : null
})
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

watch([() => hoveredIslandModel.value?.id ?? null, () => isFocusModeActive.value],
  () => {
    updateHoveredModelLabelPosition()
  },
  { flush: 'post' },
)

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

function updateHoveredModelLabelPosition() {
  const hoveredModel = hoveredIslandModel.value
  if (!hoveredModel || !viewportProjectionPort) {
    hoveredModelLabelVisible.value = false
    return
  }

  const screen = viewportProjectionPort.projectPoint(
    {
      x: hoveredModel.coordinates.x,
      y: hoveredModel.coordinates.y + HOVER_LABEL_WORLD_OFFSET,
      z: hoveredModel.coordinates.z,
    },
    hoveredModelScreenProjection,
  )

  if (!screen.visible) {
    hoveredModelLabelVisible.value = false
    return
  }

  hoveredModelLabelStyle.value.left = `${screen.x}px`
  hoveredModelLabelStyle.value.top = `${screen.y}px`
  hoveredModelLabelVisible.value = true
}

async function focusRequestedModel(modelId: string) {
  if (!islandOrchestrator) return

  const focusedModel = findById(modelId)
  if (!focusedModel) return

  clearTerrainSelection()
  focusModel(islandOrchestrator, focusedModel)
}

onMounted(async () => {
  const mountToken = ++activeMountToken
  window.addEventListener('keydown', handleWindowKeydown)
  const container = sceneRoot?.value
  if (!container) {
    throw new Error('Scene root is not available.')
  }

  try {
    const terrainUrl = await resolveIslandTerrainUrl()
    if (mountToken !== activeMountToken) {
      return
    }

    islandOrchestrator = await initScene(container, {
      terrainUrl,
      utmBbox: MALTA_TERRAIN_UTM_BBOX,
    })

    if (mountToken !== activeMountToken || !islandOrchestrator) {
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

    isLoadingModelCatalog.value = true
    await refresh()
    if (mountToken !== activeMountToken || !islandOrchestrator) {
      isLoadingModelCatalog.value = false
      return
    }

    isLoadingModelCatalog.value = false
    await renderModels(islandOrchestrator, placements.value)
    if (mountToken !== activeMountToken || !islandOrchestrator) {
      return
    }

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
      updateHoveredModelLabelPosition()
    })
    updateHoveredModelLabelPosition()
  } catch (error) {
    isLoadingModelCatalog.value = false
    console.error('Failed to initialize island view:', error)
  }
})

async function resolveIslandTerrainUrl() {
  if (!isConservativeGraphicsDevice()) return FULL_TERRAIN_URL

  try {
    const response = await fetch(MOBILE_TERRAIN_URL, { method: 'HEAD' })
    if (response.ok) return MOBILE_TERRAIN_URL
  } catch {
    return FULL_TERRAIN_URL
  }

  return FULL_TERRAIN_URL
}

function onMobileJoystickMove(input: { x: number; y: number }) {
  cameraController?.setMobileMoveInput(input)
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
  activeMountToken += 1
  isLoadingModelCatalog.value = false
  hoveredModelLabelVisible.value = false
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
    <div v-if="hoveredIslandModel && hoveredModelLabelVisible" class="island-model-hover-label"
      :style="hoveredModelLabelStyle">
      {{ hoveredIslandModel.title }}
    </div>
    <div v-if="focusedIslandModel" class="island-focused-model-card">
      <p class="island-focused-model-title">
        {{ focusedIslandModel.title }}
      </p>
      <p class="island-focused-model-creator">
        by {{ focusedIslandModel.ownerNickname }}
      </p>
    </div>
    <button v-if="markerButtonVisible" class="btn btn-primary btn-pill island-marker-add-model" type="button"
      :style="markerButtonStyle" @click.stop="openCreateModel">
      Add model
    </button>
    <div v-if="showModelLoadingHint" class="island-model-loading-hint" aria-live="polite">
      Models are loading
    </div>
    <button v-if="isFocusModeActive" class="btn island-focus-exit" type="button" @click.stop="exitFocusedModel">
      Back to island
    </button>
    <model-creation-modal :open="isCreateModelOpen" :coordinates="terrainSelectionCoordinates!"
      @close="closeCreateModel" @open-job-details="openCreatedJobDetails" />
    <login-modal :open="isLoginModalOpen" @close="closeLoginModal" @success="onLoginSuccess" />
    <profile-dock />
    <mobile-joystick class="island-mobile-joystick" @move="onMobileJoystickMove" />
  </div>
</template>
