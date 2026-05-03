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
const hoveredModelId = shallowRef<string | null>(null)
const loadingModelCount = shallowRef(0)
let onModelFocus: ((modelId: string) => void) | null = null
let onModelBlur: (() => void) | null = null

export function useIslandModelLayer() {
  function ensureRenderer(orchestrator: IslandOrchestrator): IslandModelRenderer {
    const currentScene = orchestrator.getSceneRenderer().getScene()
    const currentCamera = orchestrator.getSceneRenderer().getCamera()

    if (
      renderer.value &&
      (
        renderer.value.getScene() !== currentScene ||
        renderer.value.getCamera() !== currentCamera
      )
    ) {
      interactor.value?.dispose()
      interactor.value = null
      renderer.value.dispose()
      renderer.value = null
      hoveredModelId.value = null
      loadingModelCount.value = 0
    }

    if (renderer.value) return renderer.value

    renderer.value = new IslandModelRenderer(
      currentScene,
      currentCamera,
      {
        onLoadingStateChange: ({ pending, loading }) => {
          loadingModelCount.value = pending + loading
        },
        onHoveredModelChange: (modelId) => {
          hoveredModelId.value = modelId
        },
      },
    )
    return renderer.value
  }

  async function renderModels(orchestrator: IslandOrchestrator, models: PositionedModel[]) {
    focusedModelId.value = null
    hoveredModelId.value = null
    loadingModelCount.value = 0
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
    const currentCanvas = orchestrator.getSceneRenderer().getCanvas()
    const currentCamera = orchestrator.getSceneRenderer().getCamera()
    onModelFocus = options?.onModelFocus ?? null
    onModelBlur = options?.onModelBlur ?? null

    if (
      interactor.value &&
      (
        interactor.value.getCanvas() !== currentCanvas ||
        interactor.value.getCamera() !== currentCamera ||
        interactor.value.getRenderer() !== currentRenderer
      )
    ) {
      interactor.value.dispose()
      interactor.value = null
    }

    if (interactor.value) return

    interactor.value = new IslandModelInteractor(
      currentCamera,
      currentCanvas,
      currentRenderer,
      {
        onModelClick: (modelId) => {
          focusModel(orchestrator, modelId)
        },
        onEmptyClick: () => {
          exitFocusMode(orchestrator)
        },
        onRotationStart: () => {
          orchestrator.getCameraController().setOrbitInteractionEnabled(false)
        },
        onRotationEnd: () => {
          orchestrator.getCameraController().setOrbitInteractionEnabled(true)
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
    orchestrator.getCameraController().setOrbitInteractionEnabled(true)
    orchestrator.setTerrainClickEnabled(true)
    onModelBlur?.()
  }

  function dispose() {
    interactor.value?.dispose()
    interactor.value = null
    focusedModelId.value = null
    hoveredModelId.value = null
    loadingModelCount.value = 0
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
    hoveredModelId: computed(() => hoveredModelId.value),
    isFocusModeActive: computed(() => focusedModelId.value !== null),
    isLoadingModels: computed(() => loadingModelCount.value > 0),
    dispose,
  }
}
