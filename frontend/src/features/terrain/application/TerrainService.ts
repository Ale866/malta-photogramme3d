import { SceneRenderer } from '@/core/three/rendering/SceneRenderer'
import { LightingService } from '@/core/three/rendering/LightingService'
import { TerrainRenderer } from '@/core/three/objects/TerrainRenderer'
import { OceanRenderer } from '@/core/three/objects/OceanRenderer'
import { CameraController } from '@/core/three/controls/CameraController'
import { CoordinateMapper } from '../domain/CoordinateMapper'

export class TerrainService {
  private sceneRenderer: SceneRenderer
  private lightingService: LightingService
  private terrainRenderer: TerrainRenderer
  private oceanRenderer: OceanRenderer
  private coordinateMapper: CoordinateMapper
  private cameraController: CameraController | null = null

  constructor(
    sceneRenderer: SceneRenderer,
    coordinateMapper: CoordinateMapper
  ) {
    this.sceneRenderer = sceneRenderer
    this.coordinateMapper = coordinateMapper
    this.lightingService = new LightingService()
    this.terrainRenderer = new TerrainRenderer()
    this.oceanRenderer = new OceanRenderer()
  }

  async initialize(options: {
    terrainUrl: string
    scale?: number
    verticalExaggeration?: number
  }) {
    const lights = this.lightingService.createTerrainLighting()
    lights.forEach(light => this.sceneRenderer.add(light))

    const { root, bboxLocalXZ, yRange } = await this.terrainRenderer.loadTerrain({
      url: options.terrainUrl,
      scale: options.scale || 1,
      verticalExaggeration: options.verticalExaggeration || 1.0,
      altitudeColors: true,
      rotateY: 0,
    })

    this.coordinateMapper.setModelBbox(bboxLocalXZ)

    this.sceneRenderer.add(root)

    const ocean = this.oceanRenderer.createOcean(bboxLocalXZ)
    this.sceneRenderer.add(ocean)

    if (this.cameraController) {
      this.cameraController.frameObject(root, yRange)
    }
  }

  setCameraController(controller: CameraController) {
    this.cameraController = controller
  }

  sampleHeight(x: number, z: number) {
    return this.terrainRenderer.sampleHeightAt(x, z)
  }

  getTerrainObject() {
    return this.terrainRenderer.getTerrain()
  }

  update(elapsed: number, delta: number) {
    this.oceanRenderer.update(elapsed, delta)
  }

  dispose() {
    this.terrainRenderer.dispose()
    this.oceanRenderer.dispose()
    this.lightingService.dispose()
  }
}
