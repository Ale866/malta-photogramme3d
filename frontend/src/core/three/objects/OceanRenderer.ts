import * as T from 'three'

export class OceanRenderer {
  private oceanMesh: T.Mesh | null = null

  createOcean(bboxLocalXZ: {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
  }): T.Mesh {
    const oceanMaterial = new T.MeshStandardMaterial({
      color: 0x2a6fb0,
      roughness: 0.35,
      metalness: 0.05,
      side: T.DoubleSide,
    })

    const width = (bboxLocalXZ.maxX - bboxLocalXZ.minX) * 1.6
    const height = (bboxLocalXZ.maxZ - bboxLocalXZ.minZ) * 1.6

    this.oceanMesh = new T.Mesh(
      new T.PlaneGeometry(width, height),
      oceanMaterial
    )

    this.oceanMesh.rotation.x = -Math.PI / 2
    this.oceanMesh.position.set(0, -2, 0)
    this.oceanMesh.receiveShadow = false

    return this.oceanMesh
  }

  getOcean() {
    return this.oceanMesh
  }

  dispose() {
    if (this.oceanMesh) {
      this.oceanMesh.geometry.dispose()
      if (Array.isArray(this.oceanMesh.material)) {
        this.oceanMesh.material.forEach(m => m.dispose())
      } else {
        this.oceanMesh.material.dispose()
      }
      this.oceanMesh = null
    }
  }
}
