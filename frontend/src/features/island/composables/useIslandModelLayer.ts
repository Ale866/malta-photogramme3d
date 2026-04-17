import { computed, shallowRef } from 'vue'
import type { IslandOrchestrator } from '@/features/island/application/IslandOrchestrator'
import { IslandModelInteractor } from '@/features/island/infrastructure/IslandModelInteractor'
import { IslandModelRenderer } from '@/features/island/infrastructure/IslandModelRenderer'

type PositionedModel = {
  id: string;
  coordinates: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number };
  meshAssetUrl: string | null;
  textureAssetUrl: string | null;
}

const renderer = shallowRef<IslandModelRenderer | null>(null)
const interactor = shallowRef<IslandModelInteractor | null>(null)
const focusedModelId = shallowRef<string | null>(null)
let onModelFocus: ((modelId: string) => void) | null = null
let onModelBlur: (() => void) | null = null

export function useIslandModelLayer() {
  function ensureRenderer(orchestrator: IslandOrchestrator): IslandModelRenderer {
    if (renderer.value) return renderer.value

    renderer.value = new IslandModelRenderer(
      orchestrator.getSceneRenderer().getScene(),
      orchestrator.getSceneRenderer().getCamera(),
    )
    return renderer.value
  }

  async function renderModels(orchestrator: IslandOrchestrator, models: PositionedModel[]) {
    focusedModelId.value = null
    orchestrator.setTerrainClickEnabled(true)
    const currentRenderer = ensureRenderer(orchestrator)
    await currentRenderer.setModels(models)
    currentRenderer.refreshLoadingPriorities()
  }

  function refreshLoadingPriorities(orchestrator: IslandOrchestrator) {
    ensureRenderer(orchestrator).refreshLoadingPriorities()
  }

  function attachInteractions(
    orchestrator: IslandOrchestrator,
    options?: {
      onModelFocus?: (modelId: string) => void
      onModelBlur?: () => void
    },
  ) {
    const currentRenderer = ensureRenderer(orchestrator)
    onModelFocus = options?.onModelFocus ?? null
    onModelBlur = options?.onModelBlur ?? null
    if (interactor.value) return

    interactor.value = new IslandModelInteractor(
      orchestrator.getSceneRenderer().getCamera(),
      orchestrator.getSceneRenderer().getCanvas(),
      currentRenderer,
      {
        onModelClick: (modelId) => {
          focusModel(orchestrator, modelId)
        },
        onEmptyClick: () => {
          exitFocusMode(orchestrator)
        },
      }
    )
  }

  function focusModel(
    orchestrator: IslandOrchestrator,
    model: PositionedModel | string,
  ) {
    const currentRenderer = ensureRenderer(orchestrator)
    const modelId = typeof model === 'string' ? model : model.id
    const modelObject = currentRenderer.getModelObject(modelId)
    if (!modelObject) return

    focusedModelId.value = modelId
    orchestrator.setTerrainClickEnabled(false)
    currentRenderer.focusModel(modelId)
    orchestrator.getCameraController().focusObject(modelObject)
    orchestrator.getNavigationService().removeMarker()
    onModelFocus?.(modelId)
  }

  function exitFocusMode(orchestrator: IslandOrchestrator) {
    if (!focusedModelId.value && !orchestrator.getCameraController().hasFocusView()) return

    focusedModelId.value = null
    renderer.value?.clearFocus()
    orchestrator.getCameraController().restoreFocusView()
    orchestrator.setTerrainClickEnabled(true)
    onModelBlur?.()
  }

  function dispose() {
    interactor.value?.dispose()
    interactor.value = null
    focusedModelId.value = null
    onModelFocus = null
    onModelBlur = null
    renderer.value?.dispose()
    renderer.value = null
  }

    return {
      attachInteractions,
      renderModels,
      refreshLoadingPriorities,
      focusModel,
    exitFocusMode,
    focusedModelId: computed(() => focusedModelId.value),
    isFocusModeActive: computed(() => focusedModelId.value !== null),
    dispose,
  }
}
