<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScene } from '@/features/island/composables/useScene'
import SearchBar from '@/components/SearchBar.vue'
import ModelCreationModal from '@/features/model/components/ModelCreationModal.vue'
import type { MappedCoordinates } from '@/core/domain/Coordinates'
import type { ViewportProjectionPort } from '@/features/island/domain/ViewportProjectionPort'
import LoginModal from '@/features/auth/components/LoginModal.vue'
import { useAuth } from '@/features/auth/application/useAuth'

const { initScene, getOrchestrator, getViewportProjectionPort } = useScene()
const selectedCoordinates = ref<MappedCoordinates | null>(null)
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
const auth = useAuth()

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
  viewportProjectionPort = getViewportProjectionPort()
  orchestrator.setOnTerrainClick((coordinates) => {
    setSelectedCoordinates(coordinates)
  })

  stopCameraChangeListener = viewportProjectionPort.onViewportChange(() => {
    if (selectedCoordinates.value && !isCreateModelOpen.value && !isLoginModalOpen.value) {
      updateMarkerButtonPosition()
    }
  })
})

function onSearchSelected(query: SearchEntry) {
  const orchestrator = getOrchestrator()
  const local = orchestrator.getNavigationService().goToLatLon(query.lat, query.lon)
  const utm = orchestrator.getCoordinateMapper().localToUtm(local.x, local.z, local.y)

  setSelectedCoordinates({
    local: {
      x: local.x,
      y: local.y,
      z: local.z,
    },
    utm,
  })
}

function setSelectedCoordinates(coordinates: MappedCoordinates) {
  selectedCoordinates.value = coordinates
  isCreateModelOpen.value = false
  isLoginModalOpen.value = false
  updateMarkerButtonPosition()
}

function closeCreateModel() {
  isCreateModelOpen.value = false
  if (selectedCoordinates.value) {
    updateMarkerButtonPosition()
  } else {
    markerButtonVisible.value = false
  }
}

async function openCreateModel() {
  if (!selectedCoordinates.value) return

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
  if (selectedCoordinates.value && !isCreateModelOpen.value) {
    updateMarkerButtonPosition()
  }
}

function onLoginSuccess() {
  isLoginModalOpen.value = false
  if (selectedCoordinates.value) {
    isCreateModelOpen.value = true
    markerButtonVisible.value = false
  }
}

function updateMarkerButtonPosition() {
  if (!selectedCoordinates.value || isCreateModelOpen.value || isLoginModalOpen.value) {
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
  getOrchestrator().setOnTerrainClick(null)
})

</script>

<template>
  <div class="island-view-root">
    <search-bar @search-selected="onSearchSelected"></search-bar>
    <button v-if="markerButtonVisible" class="btn btn-primary btn-pill island-marker-add-model" type="button"
      :style="markerButtonStyle" @click.stop="openCreateModel">
      Add model
    </button>
    <model-creation-modal :open="isCreateModelOpen" :coordinates="selectedCoordinates" @close="closeCreateModel" />
    <login-modal :open="isLoginModalOpen" @close="closeLoginModal" @success="onLoginSuccess" />
  </div>
</template>
