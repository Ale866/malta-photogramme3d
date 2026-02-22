import { IslandOrchestrator } from '@/features/island/application/IslandOrchestrator'
import { shallowRef, onUnmounted } from 'vue'
import type { ViewportProjectionPort } from '@/features/island/domain/ViewportProjectionPort'
import { ThreeViewportProjectionAdapter } from '@/features/island/infrastructure/ThreeViewportProjectionAdapter'

export function useScene() {
  const orchestrator = shallowRef<IslandOrchestrator | null>(null)
  const viewportProjectionPort = shallowRef<ViewportProjectionPort | null>(null)
  const isInitialized = shallowRef(false)
  const isLoading = shallowRef(false)
  const error = shallowRef<string | null>(null)

  async function initScene(
    container: HTMLElement,
    options?: {
      terrainUrl?: string
      utmBbox?: { minE: number; minN: number; maxE: number; maxN: number }
    }
  ) {
    if (isInitialized.value) {
      console.warn('Scene already initialized')
      return orchestrator.value
    }

    isLoading.value = true
    error.value = null

    try {
      orchestrator.value = new IslandOrchestrator()

      await orchestrator.value.init(container, options)
      viewportProjectionPort.value = new ThreeViewportProjectionAdapter(
        orchestrator.value.getSceneRenderer(),
        orchestrator.value.getCameraController()
      )

      isInitialized.value = true

      const handleResize = () => orchestrator.value?.resize()
      window.addEventListener('resize', handleResize)

      onUnmounted(() => {
        window.removeEventListener('resize', handleResize)
      })

      return orchestrator.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize scene'
      console.error('Scene initialization failed:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function getOrchestrator(): IslandOrchestrator {
    if (!orchestrator.value) {
      throw new Error('Scene not initialized. Call initScene() first.')
    }
    return orchestrator.value
  }

  function getViewportProjectionPort(): ViewportProjectionPort {
    if (!viewportProjectionPort.value) {
      throw new Error('Scene not initialized. Call initScene() first.')
    }
    return viewportProjectionPort.value
  }

  function dispose() {
    if (orchestrator.value) {
      orchestrator.value.dispose()
      orchestrator.value = null
      viewportProjectionPort.value = null
      isInitialized.value = false
    }
  }

  onUnmounted(() => {
    dispose()
  })

  return {
    isInitialized,
    isLoading,
    error,
    initScene,
    getOrchestrator,
    getViewportProjectionPort,
    dispose,
  }
}
