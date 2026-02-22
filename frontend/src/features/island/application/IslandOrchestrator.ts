import { SceneRenderer } from '@/core/three/rendering/SceneRenderer'
import { CameraController } from '@/core/three/controls/CameraController'
import { InteractionHandler } from '@/core/three/controls/InteractionHandler'
import { MarkerRenderer } from '@/core/three/objects/MarkerRenderer'
import { CoordinateMapper } from '@/features/terrain/domain/CoordinateMapper'
import { TerrainService } from '@/features/terrain/application/TerrainService'
import { NavigationService } from '@/features/navigation/application/NavigationService'
import type { MappedCoordinates } from '@/core/domain/Coordinates'


export class IslandOrchestrator {
  private sceneRenderer: SceneRenderer
  private cameraController: CameraController | null = null
  private interactionHandler: InteractionHandler | null = null
  private coordinateMapper: CoordinateMapper
  private terrainService: TerrainService
  private navigationService: NavigationService | null = null
  private markerRenderer: MarkerRenderer | null = null
  private onTerrainClick: ((coordinates: MappedCoordinates) => void) | null = null

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
        this.emitTerrainClick(point)
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

  setOnTerrainClick(handler: ((coordinates: MappedCoordinates) => void) | null) {
    this.onTerrainClick = handler
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

  private emitTerrainClick(point: { x: number; y: number; z: number }) {
    if (!this.onTerrainClick) return

    const utm = this.coordinateMapper.localToUtm(point.x, point.z, point.y)
    this.onTerrainClick({
      local: {
        x: point.x,
        y: point.y,
        z: point.z,
      },
      utm,
    })
  }
}
