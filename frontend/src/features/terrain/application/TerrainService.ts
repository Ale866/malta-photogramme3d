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
      computeNormals: true,
      rotateY: 0,
    })

    this.coordinateMapper.setModelBbox(bboxLocalXZ)

    this.sceneRenderer.add(root)

    const ocean = this.oceanRenderer.createOcean(bboxLocalXZ)
    this.sceneRenderer.add(ocean)

    const terrainWidth = bboxLocalXZ.maxX - bboxLocalXZ.minX
    const terrainDepth = bboxLocalXZ.maxZ - bboxLocalXZ.minZ
    const oceanScale = 6.0
    const oceanWidth = terrainWidth * oceanScale
    const oceanDepth = terrainDepth * oceanScale

    const centerX = (bboxLocalXZ.minX + bboxLocalXZ.maxX) * 0.5
    const centerZ = (bboxLocalXZ.minZ + bboxLocalXZ.maxZ) * 0.5
    const boundHalfWidth = terrainWidth * oceanScale * 0.5 * 0.55
    const boundHalfDepth = terrainDepth * oceanScale * 0.5 * 0.55
    this.cameraController?.setBounds({
      minX: centerX - boundHalfWidth,
      maxX: centerX + boundHalfWidth,
      minZ: centerZ - boundHalfDepth,
      maxZ: centerZ + boundHalfDepth,
    })

    const minOceanDim = Math.min(oceanWidth, oceanDepth)
    const fogFar = Math.max(500, Math.min(1400, minOceanDim * 0.5))
    const fogNear = Math.max(200, fogFar * 0.4)
    this.sceneRenderer.setFogRange(fogNear, fogFar)

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

  update(elapsed: number) {
    this.oceanRenderer.update(elapsed)
  }

  dispose() {
    this.terrainRenderer.dispose()
    this.oceanRenderer.dispose()
    this.lightingService.dispose()
  }
}
