import * as T from 'three'
import vertexShader from '../shaders/ocean/vertex.glsl?raw'
import fragmentShader from '../shaders/ocean/fragment.glsl?raw'
import { isConservativeGraphicsDevice } from '@/core/device/performance'

export class OceanRenderer {
  private oceanMesh: T.Mesh<T.PlaneGeometry, T.ShaderMaterial> | null = null
  private depthColor = new T.Color(6 / 255, 66 / 255, 115 / 255)
  private surfaceColor = new T.Color(143 / 255, 210 / 255, 242 / 255)
  private readonly lowPowerMode = isConservativeGraphicsDevice()
  private lastAnimatedElapsed = -Infinity

  createOcean(bboxLocalXZ: {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
  }): T.Mesh {
    const terrainWidth = bboxLocalXZ.maxX - bboxLocalXZ.minX
    const terrainHeight = bboxLocalXZ.maxZ - bboxLocalXZ.minZ
    const visualScale = 4.0
    const planeScale = 6.0

    const width = terrainWidth * planeScale
    const height = terrainHeight * planeScale
    const visualWidth = terrainWidth * visualScale
    const visualHeight = terrainHeight * visualScale
    const visualMaxDim = Math.max(visualWidth, visualHeight)
    const segments = this.lowPowerMode ? 64 : 512
    const uniforms = {
      fogNear: { value: 1 },
      fogFar: { value: 2000 },
      fogColor: { value: new T.Color(230 / 255, 240 / 255, 255 / 255) },
      uTime: { value: 0 },
      uBigWavesElevation: { value: this.lowPowerMode ? 0.125 : 0.15 },
      uBigWavesFrequency: {
        value: new T.Vector2(
          8.0 / visualWidth,
          3.0 / visualHeight
        ),
      },
      uBigWavesSpeed: { value: this.lowPowerMode ? 0.16 : 0.2 },
      uSmallWavesElevation: { value: this.lowPowerMode ? 0.27 : 0.35 },
      uSmallWavesFrequency: { value: (this.lowPowerMode ? 5.0 : 6.0) / visualMaxDim },
      uSmallWavesSpeed: { value: this.lowPowerMode ? 0.082 : 0.1 },
      uSmallIterations: { value: this.lowPowerMode ? 3.0 : 4.0 },
      uDisplacementScale: { value: this.lowPowerMode ? 21 : 25 },
      uDepthColor: { value: this.depthColor },
      uSurfaceColor: { value: this.surfaceColor },
      uColorOffset: { value: 0.1 },
      uColorMultiplier: { value: 2.0 },
      uIslandMin: { value: new T.Vector2(bboxLocalXZ.minX, bboxLocalXZ.minZ) },
      uIslandMax: { value: new T.Vector2(bboxLocalXZ.maxX, bboxLocalXZ.maxZ) },
    }

    const oceanMaterial = new T.ShaderMaterial({
      vertexShader,
      fragmentShader,
      fog: true,
      transparent: true,
      depthWrite: false,
      uniforms
    })

    this.oceanMesh = new T.Mesh(
      new T.PlaneGeometry(width, height, segments, segments),
      oceanMaterial
    )

    this.oceanMesh.rotation.x = -Math.PI / 2
    this.oceanMesh.position.set(0, -2, 0)
    this.oceanMesh.receiveShadow = false

    return this.oceanMesh
  }

  update(elapsed: number) {
    const material = this.oceanMesh?.material
    if (material instanceof T.ShaderMaterial && material.uniforms.uTime) {
      if (this.lowPowerMode && elapsed - this.lastAnimatedElapsed < 1 / 30) {
        return
      }
      this.lastAnimatedElapsed = elapsed
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
    this.lastAnimatedElapsed = -Infinity
  }
}
