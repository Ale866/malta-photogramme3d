import * as T from 'three'
import vertexShader from '../shaders/ocean/vertex.glsl?raw'
import fragmentShader from '../shaders/ocean/fragment.glsl?raw'

export class OceanRenderer {
  private oceanMesh: T.Mesh<T.PlaneGeometry, T.ShaderMaterial> | null = null
  private depthColor = new T.Color(6 / 255, 66 / 255, 115 / 255)
  private surfaceColor = new T.Color(143 / 255, 210 / 255, 242 / 255)

  createOcean(bboxLocalXZ: {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
  }): T.Mesh {
    const width = (bboxLocalXZ.maxX - bboxLocalXZ.minX) * 4.0
    const height = (bboxLocalXZ.maxZ - bboxLocalXZ.minZ) * 4.0
    const maxDim = Math.max(width, height)
    const displacementScale = 25

    const oceanMaterial = new T.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBigWavesElevation: { value: 0.15 },
        uBigWavesFrequency: {
          value: new T.Vector2(
            8.0 / width,
            3.0 / height
          ),
        },
        uBigWavesSpeed: { value: 0.2 },

        uSmallWavesElevation: { value: 0.35 },
        uSmallWavesFrequency: { value: 6.0 / maxDim },
        uSmallWavesSpeed: { value: 0.1 },
        uSmallIterations: { value: 4.0 },
        uDisplacementScale: { value: displacementScale },

        uDepthColor: { value: this.depthColor },
        uSurfaceColor: { value: this.surfaceColor },
        uColorOffset: { value: 0.1 },
        uColorMultiplier: { value: 2.0 },
      }
    })

    this.oceanMesh = new T.Mesh(
      new T.PlaneGeometry(width, height, 512, 512),
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
