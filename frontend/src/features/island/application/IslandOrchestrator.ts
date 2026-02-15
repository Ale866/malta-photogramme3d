import { SceneRenderer } from '@/core/three/rendering/SceneRenderer'
import { CameraController } from '@/core/three/controls/CameraController'
import { InteractionHandler } from '@/core/three/controls/InteractionHandler'
import { MarkerRenderer } from '@/core/three/objects/MarkerRenderer'
import { CoordinateMapper } from '@/features/terrain/domain/CoordinateMapper'
import { TerrainService } from '@/features/terrain/application/TerrainService'
import { NavigationService } from '@/features/navigation/application/NavigationService'


export class IslandOrchestrator {
  private sceneRenderer: SceneRenderer
  private cameraController: CameraController | null = null
  private interactionHandler: InteractionHandler | null = null
  private coordinateMapper: CoordinateMapper
  private terrainService: TerrainService
  private navigationService: NavigationService | null = null
  private markerRenderer: MarkerRenderer | null = null

  constructor() {
    this.sceneRenderer = new SceneRenderer()
    this.coordinateMapper = new CoordinateMapper()

    this.terrainService = new TerrainService(
      this.sceneRenderer,
      this.coordinateMapper
    )
  }

  async init(
    container: HTMLElement,
    options?: {
      terrainUrl?: string
      utmBbox?: { minE: number; minN: number; maxE: number; maxN: number }
    }
  ) {
    const {
      terrainUrl = '/terrain/malta.glb',
      utmBbox,
    } = options || {}

    this.sceneRenderer.initialize(container)

    this.cameraController = new CameraController(
      this.sceneRenderer.getCamera(),
      this.sceneRenderer.getCanvas()
    )

    this.terrainService.setCameraController(this.cameraController)

    if (utmBbox) {
      this.coordinateMapper.setUtmBbox(utmBbox)
    }

    await this.terrainService.initialize({
      terrainUrl,
      scale: 1,
      verticalExaggeration: 1.0,
    })

    this.markerRenderer = new MarkerRenderer(this.sceneRenderer.getScene())

    this.navigationService = new NavigationService(
      this.cameraController,
      this.markerRenderer,
      this.coordinateMapper,
      this.terrainService
    )

    this.interactionHandler = new InteractionHandler(
      this.sceneRenderer.getCamera(),
      this.sceneRenderer.getCanvas()
    )

    this.interactionHandler.setupClickHandler(
      (point) => {
        this.navigationService?.goToPosition(point)
      },
      this.sceneRenderer.getScene(),
      this.terrainService.getTerrainObject() || undefined
    )

    this.sceneRenderer.startRenderLoop(() => {
      this.cameraController?.update()
    })
  }

  getNavigationService() {
    if (!this.navigationService) {
      throw new Error('IslandOrchestrator not initialized. Call init() first.')
    }
    return this.navigationService
  }

  getCoordinateMapper() {
    return this.coordinateMapper
  }

  resize() {
    this.sceneRenderer.resize()
  }

  setVisible(visible: boolean) {
    this.sceneRenderer.setVisible(visible)
  }

  dispose() {
    this.sceneRenderer.stopRenderLoop()
    this.terrainService.dispose()
    this.navigationService?.dispose()
    this.cameraController?.dispose()
    this.sceneRenderer.dispose()
  }
}
