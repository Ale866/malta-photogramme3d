import { shallowRef } from 'vue'
import type { IslandOrchestrator } from '@/features/island/application/IslandOrchestrator'
import { IslandModelInteractor } from '@/features/island/infrastructure/IslandModelInteractor'
import { IslandModelRenderer } from '@/features/island/infrastructure/IslandModelRenderer'

type PositionedModel = {
  id: string;
  coordinates: { x: number; y: number; z: number };
}

const renderer = shallowRef<IslandModelRenderer | null>(null)
const interactor = shallowRef<IslandModelInteractor | null>(null)

export function useIslandModelLayer() {
  function ensureRenderer(orchestrator: IslandOrchestrator): IslandModelRenderer {
    if (renderer.value) return renderer.value

    renderer.value = new IslandModelRenderer(orchestrator.getSceneRenderer().getScene())
    return renderer.value
  }

  function renderModels(orchestrator: IslandOrchestrator, models: PositionedModel[]) {
    ensureRenderer(orchestrator).setModels(models)
  }

  function attachInteractions(
    orchestrator: IslandOrchestrator,
    options?: { onModelFocus?: (modelId: string) => void },
  ) {
    const currentRenderer = ensureRenderer(orchestrator)
    if (interactor.value) return

    interactor.value = new IslandModelInteractor(
      orchestrator.getSceneRenderer().getCamera(),
      orchestrator.getSceneRenderer().getCanvas(),
      currentRenderer,
      {
        onModelClick: (modelId) => {
          const coordinates = currentRenderer.getCoordinates(modelId)
          if (!coordinates) return

          orchestrator.getNavigationService().focusCoordinates(coordinates)
          orchestrator.getNavigationService().removeMarker()
          options?.onModelFocus?.(modelId)
        },
      }
    )
  }

  function focusModel(
    orchestrator: IslandOrchestrator,
    coordinates: { x: number; y: number; z: number },
  ) {
    orchestrator.getNavigationService().focusCoordinates(coordinates)
    orchestrator.getNavigationService().removeMarker()
  }

  function dispose() {
    interactor.value?.dispose()
    interactor.value = null
    renderer.value?.dispose()
    renderer.value = null
  }

  return {
    attachInteractions,
    renderModels,
    focusModel,
    dispose,
  }
}
