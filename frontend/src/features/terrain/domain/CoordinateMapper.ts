import * as T from 'three'

export class CoordinateMapper {
  private utmBbox: {
    minE: number
    minN: number
    maxE: number
    maxN: number
  } | null = null

  private modelBboxXZ: {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
  } | null = null

  setUtmBbox(bbox: {
    minE: number
    minN: number
    maxE: number
    maxN: number
  }) {
    this.utmBbox = bbox
  }

  setModelBbox(bbox: {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
  }) {
    this.modelBboxXZ = bbox
  }

  utmToLocal(easting: number, northing: number, y = 0) {
    if (!this.utmBbox || !this.modelBboxXZ) {
      console.warn('CoordinateMapper: Bounding boxes not set, returning origin')
      return new T.Vector3(0, y, 0)
    }

    const { minE, minN, maxE, maxN } = this.utmBbox
    const { minX, minZ, maxX, maxZ } = this.modelBboxXZ

    const u = (easting - minE) / (maxE - minE)
    const v = (northing - minN) / (maxN - minN)

    const x = minX + u * (maxX - minX)
    const z = maxZ - v * (maxZ - minZ)

    return new T.Vector3(x, y, z)
  }

  isReady() {
    return this.utmBbox !== null && this.modelBboxXZ !== null
  }

  getUtmBbox() {
    return this.utmBbox
  }

  getModelBbox() {
    return this.modelBboxXZ
  }
}
