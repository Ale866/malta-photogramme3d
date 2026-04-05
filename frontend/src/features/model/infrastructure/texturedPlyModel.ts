import * as T from 'three'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'

type LoadTexturedPlyModelInput = {
  meshUrl: string
  textureUrl?: string | null
}

const SHARED_ASSET_KEY = '__sharedModelAsset'
const plyLoader = new PLYLoader()
const textureLoader = new T.TextureLoader()
const geometryCache = new Map<string, Promise<T.BufferGeometry>>()
const textureCache = new Map<string, Promise<T.Texture | null>>()

export async function loadTexturedPlyModel(input: LoadTexturedPlyModelInput): Promise<T.Group> {
  const geometry = await loadCachedGeometry(input.meshUrl)

  const materialOptions: ConstructorParameters<typeof T.MeshStandardMaterial>[0] = {
    roughness: 0.92,
    metalness: 0,
    side: T.DoubleSide,
  }

  if (geometry.getAttribute('color')) {
    materialOptions.vertexColors = true
  }

  if (input.textureUrl && geometry.getAttribute('uv')) {
    try {
      const texture = await loadCachedTexture(input.textureUrl)
      if (texture) {
        materialOptions.map = texture
      }
    } catch (error) {
      console.warn(`Failed to load model texture from ${input.textureUrl}`, error)
    }
  }

  const material = new T.MeshStandardMaterial(materialOptions)
  const mesh = new T.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const root = new T.Group()
  root.add(mesh)

  const box = new T.Box3().setFromObject(mesh)
  const center = box.getCenter(new T.Vector3())
  mesh.position.set(-center.x, -box.min.y, -center.z)

  return root
}

export function disposeObject3D(object: T.Object3D) {
  object.traverse((child) => {
    const mesh = child as T.Mesh
    if (!mesh.isMesh) return

    if (!mesh.geometry?.userData?.[SHARED_ASSET_KEY]) {
      mesh.geometry?.dispose()
    }

    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        disposeMaterial(material)
      }
      return
    }

    disposeMaterial(mesh.material)
  })
}

function disposeMaterial(material: T.Material) {
  const standardMaterial = material as T.MeshStandardMaterial
  if (!standardMaterial.map?.userData?.[SHARED_ASSET_KEY]) {
    standardMaterial.map?.dispose()
  }
  material.dispose()
}

function loadCachedGeometry(meshUrl: string) {
  let cached = geometryCache.get(meshUrl)
  if (cached) return cached

  cached = plyLoader.loadAsync(meshUrl).then((geometry) => {
    geometry.computeVertexNormals()
    geometry.userData[SHARED_ASSET_KEY] = true
    return geometry
  })
  geometryCache.set(meshUrl, cached)
  return cached
}

function loadCachedTexture(textureUrl: string) {
  let cached = textureCache.get(textureUrl)
  if (cached) return cached

  cached = textureLoader.loadAsync(textureUrl).then((texture) => {
    texture.colorSpace = T.SRGBColorSpace
    texture.userData[SHARED_ASSET_KEY] = true
    return texture
  })
  textureCache.set(textureUrl, cached)
  return cached
}
