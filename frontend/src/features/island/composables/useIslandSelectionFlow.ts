import { computed, ref } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'
import type { IslandOrchestrator } from '@/features/island/application/IslandOrchestrator'
import type { ViewportProjectionPort } from '@/features/island/domain/ViewportProjectionPort'

type Coordinates3D = { x: number; y: number; z: number }

type UseIslandSelectionFlowOptions = {
  getOrchestrator: () => IslandOrchestrator
  getViewportProjectionPort: () => ViewportProjectionPort | null
}

export function useIslandSelectionFlow(options: UseIslandSelectionFlowOptions) {
  const auth = useAuth()
  const terrainSelectionCoordinates = ref<Coordinates3D | null>(null)
  const isCreateModelOpen = ref(false)
  const isLoginModalOpen = ref(false)
  const markerButtonVisible = ref(false)
  const markerButtonStyle = ref<{ left: string; top: string }>({
    left: '0px',
    top: '0px',
  })
  const hasTerrainSelection = computed(() => terrainSelectionCoordinates.value !== null)
  const screenProjection = { x: 0, y: 0, visible: false }

  function onSearchSelected(query: SearchEntry) {
    clearTerrainSelection()
    const coordinates = options.getOrchestrator().getNavigationService().goToLatLon(query.lat, query.lon)
    setTerrainSelection(coordinates)
  }

  function setTerrainSelection(coordinates: Coordinates3D) {
    terrainSelectionCoordinates.value = coordinates
    isCreateModelOpen.value = false
    isLoginModalOpen.value = false
    updateMarkerButtonPosition()
  }

  function clearTerrainSelection() {
    terrainSelectionCoordinates.value = null
    markerButtonVisible.value = false
    options.getOrchestrator().getNavigationService().removeMarker()
  }

  function closeCreateModel() {
    isCreateModelOpen.value = false
    if (terrainSelectionCoordinates.value) {
      updateMarkerButtonPosition()
      return
    }

    markerButtonVisible.value = false
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

    const viewportProjectionPort = options.getViewportProjectionPort()
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

  return {
    terrainSelectionCoordinates,
    hasTerrainSelection,
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
  }
}
