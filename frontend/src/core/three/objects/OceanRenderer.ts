import * as T from 'three'
import vertexShader from '../shaders/ocean/vertex.glsl?raw'
import fragmentShader from '../shaders/ocean/fragment.glsl?raw'

export class OceanRenderer {
  private oceanMesh: T.Mesh<T.PlaneGeometry, T.ShaderMaterial> | null = null

  createOcean(bboxLocalXZ: {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
  }): T.Mesh {
    const oceanMaterial = new T.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBigWavesAnimation: { value: 0.2 },
        uBigWavesFrequency: { value: new T.Vector2(4, 1.5) },
        uBigWavesSpeed: { value: 0.75 }
      }
    })

    const width = (bboxLocalXZ.maxX - bboxLocalXZ.minX) * 1.6
    const height = (bboxLocalXZ.maxZ - bboxLocalXZ.minZ) * 1.6

    this.oceanMesh = new T.Mesh(
      new T.PlaneGeometry(width, height, 128, 128),
      oceanMaterial
    )

    this.oceanMesh.rotation.x = -Math.PI / 2
    this.oceanMesh.position.set(0, -2, 0)
    this.oceanMesh.receiveShadow = false

    return this.oceanMesh
  }

  update(elapsed: number, _: number) {
    const material = this.oceanMesh?.material
    if (material instanceof T.ShaderMaterial && material.uniforms.uTime) {
      material.uniforms.uTime.value = elapsed
    }
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
