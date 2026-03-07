import { shallowRef } from 'vue'
import type { IslandOrchestrator } from '@/features/island/application/IslandOrchestrator'
import { IslandModelRenderer } from '@/features/island/infrastructure/IslandModelRenderer'

type PositionedModel = {
  id: string;
  coordinates: { x: number; y: number; z: number };
}

const renderer = shallowRef<IslandModelRenderer | null>(null)

export function useIslandModelLayer() {
  function ensureRenderer(orchestrator: IslandOrchestrator): IslandModelRenderer {
    if (renderer.value) return renderer.value

    renderer.value = new IslandModelRenderer(orchestrator.getSceneRenderer().getScene())
    return renderer.value
  }

  function renderModels(orchestrator: IslandOrchestrator, models: PositionedModel[]) {
    ensureRenderer(orchestrator).setModels(models)
  }

  function focusCoordinates(
    orchestrator: IslandOrchestrator,
    coordinates: { x: number; y: number; z: number },
  ) {
    return orchestrator.getNavigationService().goToCoordinates(coordinates)
  }

  function dispose() {
    renderer.value?.dispose()
    renderer.value = null
  }

  return {
    renderModels,
    focusCoordinates,
    dispose,
  }
}
