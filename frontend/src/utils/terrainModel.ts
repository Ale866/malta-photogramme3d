import * as T from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1)
  return t * t * (3 - 2 * t)
}

function lerpColor(a: T.Color, b: T.Color, t: number) {
  return new T.Color(
    lerp(a.r, b.r, t),
    lerp(a.g, b.g, t),
    lerp(a.b, b.b, t),
  )
}

function heightToColor(h01: number) {
  const grass = new T.Color(0x5b7f42)
  const hill = new T.Color(0xc8b06f)
  const rock = new T.Color(0x9b7a5e)

  if (h01 < 0.16) return lerpColor(grass, hill, smoothstep(0, 0.16, h01))
  if (h01 < 0.78) return lerpColor(hill, hill.clone().offsetHSL(0, -0.04, 0.04), smoothstep(0.16, 0.78, h01))
  return lerpColor(hill, rock, smoothstep(0.78, 1, h01))
}

export type TerrainModelResult = {
  root: T.Group
  bboxLocalXZ: { minX: number; minZ: number; maxX: number; maxZ: number }
  yRange: { min: number; max: number }
}

export async function loadTerrainModelGLB(options: {
  url: string
  origin: T.Vector2
  scale?: number
  verticalExaggeration?: number
  altitudeColors?: boolean
  rotateY?: number
}): Promise<TerrainModelResult> {
  const {
    url,
    origin,
    scale = 1,
    verticalExaggeration = 1,
    altitudeColors = true,
    rotateY = 0,
  } = options

  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(url)
  const root = gltf.scene

  root.rotation.y += rotateY

  root.scale.setScalar(scale)
  root.scale.y *= verticalExaggeration

  const box0 = new T.Box3().setFromObject(root)
  const center0 = new T.Vector3()
  box0.getCenter(center0)

  origin.set(center0.x, center0.z)

  const baseY0 = box0.min.y
  root.position.set(-center0.x, -baseY0, -center0.z)

  const box = new T.Box3().setFromObject(root)

  const bboxLocalXZ = {
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
  }

  const yRange = { min: box.min.y, max: box.max.y }

  root.traverse((obj) => {
    const mesh = obj as T.Mesh
    if (!mesh.isMesh || !mesh.geometry) return

    mesh.material = new T.MeshStandardMaterial({
      vertexColors: altitudeColors,
      roughness: 0.95,
      metalness: 0.0,
      side: T.DoubleSide,
      flatShading: false,
    })

    const geom = mesh.geometry as T.BufferGeometry
    const pos = geom.attributes.position as T.BufferAttribute | undefined
    if (!pos) return

    if (altitudeColors) {
      const colors = new Float32Array(pos.count * 3)
      const colAttr = new T.BufferAttribute(colors, 3)

      const denom = Math.max(1e-6, yRange.max - yRange.min)
      const tmp = new T.Color()

      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        const h01 = clamp((y - yRange.min) / denom, 0, 1)
        tmp.copy(heightToColor(h01))
        colAttr.setXYZ(i, tmp.r, tmp.g, tmp.b)
      }

      geom.setAttribute('color', colAttr)
    }

    geom.computeVertexNormals()

    mesh.castShadow = true
    mesh.receiveShadow = true
  })

  return { root, bboxLocalXZ, yRange }
}
