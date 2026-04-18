import * as T from 'three'

type LoadTexturedPlyModelInput = {
  meshUrl: string
  textureUrl?: string | null
}

const SHARED_ASSET_KEY = '__sharedModelAsset'
const textureLoader = new T.TextureLoader()
const geometryCache = new Map<string, Promise<T.BufferGeometry>>()
const gltfCache = new Map<string, Promise<T.Object3D>>()
const textureCache = new Map<string, Promise<T.Texture | null>>()
let plyLoaderPromise: Promise<{ loadAsync(url: string): Promise<T.BufferGeometry> }> | null = null
let gltfLoaderPromise: Promise<{ loadAsync(url: string): Promise<{ scene?: T.Object3D; scenes: T.Object3D[] }> }> | null = null

export async function loadDeliveredModel(input: LoadTexturedPlyModelInput): Promise<T.Group> {
  try {
    const glbScene = await loadCachedGlbScene(input.meshUrl)
    const instance = createGlbInstance(glbScene)
    return centerLoadedObject(instance)
  } catch (error) {
    console.warn(`Failed to load GLB model from ${input.meshUrl}; falling back to textured PLY`, error)
    return loadTexturedPlyModel(input)
  }
}

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

  return centerLoadedObject(mesh)
}

export function disposeObject3D(object: T.Object3D) {
  const disposedTextures = new Set<T.Texture>()

  object.traverse((child) => {
    const mesh = child as T.Mesh
    if (!mesh.isMesh) return

    if (!mesh.geometry?.userData?.[SHARED_ASSET_KEY]) {
      mesh.geometry?.dispose()
    }

    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        disposeMaterial(material, disposedTextures)
      }
      return
    }

    disposeMaterial(mesh.material, disposedTextures)
  })
}

function disposeMaterial(material: T.Material, disposedTextures: Set<T.Texture>) {
  const typedMaterial = material as T.Material & Record<string, unknown>

  for (const value of Object.values(typedMaterial)) {
    if (!(value instanceof T.Texture)) continue
    if (value.userData?.[SHARED_ASSET_KEY]) continue
    if (disposedTextures.has(value)) continue

    disposedTextures.add(value)
    value.dispose()
  }

  material.dispose()
}

function loadCachedGeometry(meshUrl: string) {
  let cached = geometryCache.get(meshUrl)
  if (cached) return cached

  cached = getPlyLoader().then((loader) =>
    loader.loadAsync(meshUrl).then((geometry) => {
      geometry.computeVertexNormals()
      geometry.userData[SHARED_ASSET_KEY] = true
      return geometry
    }),
  )
  geometryCache.set(meshUrl, cached)
  return cached
}

function loadCachedGlbScene(meshUrl: string) {
  let cached = gltfCache.get(meshUrl)
  if (cached) return cached

  cached = getGltfLoader().then((loader) =>
    loader.loadAsync(meshUrl).then((gltf) => {
      const root = gltf.scene ?? gltf.scenes[0]
      if (!root) {
        throw new Error(`GLB scene is empty for ${meshUrl}`)
      }

      root.traverse((child) => {
        const mesh = child as T.Mesh
        if (!mesh.isMesh) return

        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.geometry?.userData && (mesh.geometry.userData[SHARED_ASSET_KEY] = true)

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const material of materials) {
          markSharedTextures(material)
        }
      })

      return root
    }),
  )
  gltfCache.set(meshUrl, cached)
  return cached
}

function markSharedTextures(material: T.Material) {
  const typedMaterial = material as T.Material & Record<string, unknown>

  for (const value of Object.values(typedMaterial)) {
    if (value instanceof T.Texture) {
      value.userData[SHARED_ASSET_KEY] = true
    }
  }
}

function createGlbInstance(source: T.Object3D) {
  const clone = source.clone(true)

  clone.traverse((child) => {
    const mesh = child as T.Mesh
    if (!mesh.isMesh) return

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => material.clone())
      return
    }

    mesh.material = mesh.material.clone()
  })

  return clone
}

function centerLoadedObject(object: T.Object3D) {
  const root = new T.Group()
  root.add(object)

  const box = new T.Box3().setFromObject(object)
  const center = box.getCenter(new T.Vector3())
  object.position.set(-center.x, -box.min.y, -center.z)

  return root
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

function getPlyLoader() {
  plyLoaderPromise ??= import('three/examples/jsm/loaders/PLYLoader.js').then(({ PLYLoader }) => new PLYLoader())
  return plyLoaderPromise
}

function getGltfLoader() {
  gltfLoaderPromise ??= import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader())
  return gltfLoaderPromise
}
