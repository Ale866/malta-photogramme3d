import * as T from 'three'
import { loadTerrainModelGLB } from '@/utils/terrainModel'
import type { TerrainModelResult } from '@/utils/terrainModel'


export class TerrainRenderer {
  private terrain: T.Object3D | null = null
  private origin = new T.Vector2()
  private bboxLocalXZ: { minX: number; minZ: number; maxX: number; maxZ: number } | null = null
  private yRange: { min: number; max: number } | null = null

  async loadTerrain(options: {
    url: string
    scale?: number
    verticalExaggeration?: number
    altitudeColors?: boolean
    rotateY?: number
  }): Promise<TerrainModelResult> {
    const result = await loadTerrainModelGLB({
      ...options,
      origin: this.origin,
    })

    this.terrain = result.root
    this.bboxLocalXZ = result.bboxLocalXZ
    this.yRange = result.yRange

    return result
  }

  sampleHeightAt(x: number, z: number): number {
    if (!this.terrain) return 0

    const raycaster = new T.Raycaster()
    const from = new T.Vector3(x, 2_000_000, z)
    const direction = new T.Vector3(0, -1, 0)

    raycaster.set(from, direction)

    const hits = raycaster.intersectObject(this.terrain, true)
    if (hits.length > 0) {
      return hits[0]!.point.y
    }

    return 0
  }

  getTerrain() {
    return this.terrain
  }

  getBoundingBox() {
    return this.bboxLocalXZ
  }

  getYRange() {
    return this.yRange
  }

  dispose() {
    if (this.terrain) {
      this.terrain.traverse((obj) => {
        if (obj instanceof T.Mesh) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material?.dispose()
          }
        }
      })
      this.terrain = null
    }
  }
}
