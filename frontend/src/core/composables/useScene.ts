import { shallowRef, onUnmounted } from 'vue'
import { SceneOrchestrator } from '@/core/three/SceneOrchestrator'

export function useScene() {
  const orchestrator = shallowRef<SceneOrchestrator | null>(null)
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
      orchestrator.value = new SceneOrchestrator()

      await orchestrator.value.init(container, options)

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

  function getOrchestrator(): SceneOrchestrator {
    if (!orchestrator.value) {
      throw new Error('Scene not initialized. Call initScene() first.')
    }
    return orchestrator.value
  }

  function dispose() {
    if (orchestrator.value) {
      orchestrator.value.dispose()
      orchestrator.value = null
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
    dispose,
  }
}
